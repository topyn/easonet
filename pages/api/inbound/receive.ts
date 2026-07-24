import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'crypto'
import { prisma } from '../../../lib/prisma'
import { simpleParser } from 'mailparser'
import { uploadAttachment, sanitizeFilename } from '../../../lib/storage'

// Disable body parsing - we need the raw email payload
export const config = { api: { bodyParser: false } }

function normalizeSubject(subject: string): string {
  return subject.replace(/^((re|fwd?):\s*)+/i, '').trim().toLowerCase()
}

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  // Verify webhook secret to prevent spoofing
  const secret = req.headers['x-webhook-secret']
  if (secret !== process.env.INBOUND_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const rawBody = await getRawBody(req)
    const parsed = await simpleParser(rawBody)

    const toAddress = parsed.to
      ? (Array.isArray(parsed.to) ? parsed.to[0] : parsed.to).text
      : ''
    const ccAddress = parsed.cc
      ? (Array.isArray(parsed.cc) ? parsed.cc[0] : parsed.cc).text
      : undefined
    const fromAddress = parsed.from?.text ?? ''
    const subject = parsed.subject ?? '(no subject)'
    const messageId = parsed.messageId ?? undefined
    const inReplyTo = parsed.inReplyTo ?? undefined

    // Match the "to" address to an identity
    const toEmail = toAddress.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0]?.toLowerCase()
    if (!toEmail) return res.status(400).json({ error: 'Could not parse To address' })

    const identity = await prisma.identity.findUnique({ where: { email: toEmail } })
    if (!identity) {
      // Unknown alias - store anyway under a catch-all log, or just drop
      console.warn('Inbound email to unknown alias:', toEmail)
      return res.status(200).json({ ok: true, note: 'unknown alias, dropped' })
    }

    // Try to match to an existing thread via In-Reply-To header
    let thread = null
    if (inReplyTo) {
      const referencedMsg = await prisma.message.findFirst({
        where: { rawMessageId: inReplyTo },
        include: { thread: true },
      })
      thread = referencedMsg?.thread ?? null
    }

    // Fallback: same identity, same sender already in the thread, and an exact match
    // on the normalized subject (not `contains` — a short/common subject could
    // otherwise merge two unrelated conversations into one thread).
    if (!thread) {
      const fromEmail = fromAddress.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0]?.toLowerCase()
      const normalizedSubject = normalizeSubject(subject)
      const candidates = await prisma.thread.findMany({
        where: {
          identityId: identity.id,
          ...(fromEmail ? { participants: { has: fromEmail } } : {}),
        },
        orderBy: { lastAt: 'desc' },
        take: 20,
      })
      thread = candidates.find(t => normalizeSubject(t.subject) === normalizedSubject) ?? null
    }

    const ccEmails = ccAddress ? ccAddress.match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? [] : []

    // Create new thread if no match
    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          subject,
          identityId: identity.id,
          userId: identity.userId,
          participants: [toEmail, fromAddress.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] ?? fromAddress, ...ccEmails],
          lastAt: new Date(),
        },
      })
    } else {
      await prisma.thread.update({
        where: { id: thread.id },
        data: { lastAt: new Date() },
      })
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        direction: 'inbound',
        fromAddress,
        toAddress,
        ccAddress: ccAddress || null,
        subject,
        bodyText: parsed.text ?? '',
        bodyHtml: parsed.html || null,
        rawMessageId: messageId,
      },
    })

    for (const att of parsed.attachments ?? []) {
      const path = `inbound/${identity.id}/${randomUUID()}-${sanitizeFilename(att.filename || 'attachment')}`
      try {
        await uploadAttachment(req, res, path, att.content, att.contentType || 'application/octet-stream')
        await prisma.attachment.create({
          data: {
            messageId: message.id,
            filename: att.filename || 'attachment',
            mimeType: att.contentType || 'application/octet-stream',
            size: att.size ?? att.content.length,
            storagePath: path,
          },
        })
      } catch (err) {
        console.error('Inbound attachment upload failed:', err)
      }
    }

    return res.status(200).json({ ok: true, threadId: thread.id })
  } catch (err) {
    console.error('Inbound parse error:', err)
    return res.status(500).json({ error: 'Failed to process inbound email' })
  }
}
