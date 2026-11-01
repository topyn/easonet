import type { NextApiRequest, NextApiResponse } from 'next'
import type { Identity } from '@prisma/client'
import type { ParsedMail } from 'mailparser'
import { randomUUID } from 'crypto'
import { prisma } from '../prisma'
import { uploadAttachment, sanitizeFilename } from '../storage'

// Files one parsed inbound email under an identity: threading, blocked-sender handling,
// message row and attachments. Shared by the Cloudflare webhook (/api/inbound/receive) and
// our own MX servers (/api/mail/ingest), which only differ in how they pick the identity.

const EMAIL_RE = /[\w.+-]+@[\w.-]+\.\w+/

export function firstEmail(text: string | undefined): string | undefined {
  return text?.match(EMAIL_RE)?.[0]?.toLowerCase()
}

export function normalizeSubject(subject: string): string {
  return subject.replace(/^((re|fwd?):\s*)+/i, '').trim().toLowerCase()
}

function addressText(field: ParsedMail['to']): string | undefined {
  if (!field) return undefined
  return (Array.isArray(field) ? field[0] : field).text
}

export async function storeInboundEmail(opts: {
  req: NextApiRequest
  res: NextApiResponse
  parsed: ParsedMail
  identity: Identity
  /** Mark the thread as spam regardless of blocked senders (e.g. MX spam score). */
  markSpam?: boolean
}): Promise<{ threadId: string; spam: boolean }> {
  const { req, res, parsed, identity } = opts
  const toEmail = identity.email.toLowerCase()

  const toAddress = addressText(parsed.to) ?? ''
  const ccAddress = addressText(parsed.cc)
  const fromAddress = parsed.from?.text ?? ''
  const subject = parsed.subject ?? '(no subject)'
  const messageId = parsed.messageId ?? undefined
  const inReplyTo = parsed.inReplyTo ?? undefined
  const fromEmail = firstEmail(fromAddress)

  // A user marking a thread as spam blocks the sender going forward — new mail from them
  // still arrives and is stored (never silently dropped, so a mistaken block is
  // recoverable), it just lands in spam instead of the inbox. Existing open threads from
  // this sender were already swept to spam at block-time (see the thread PATCH handler).
  // Guard: mail whose From is this identity's own address is never treated as blocked, even
  // if a stale self-block row somehow exists — otherwise every self-addressed notification
  // (a site emailing its own admin inbox) would land in spam.
  const isBlocked = fromEmail && fromEmail !== toEmail
    ? !!(await prisma.blockedSender.findUnique({ where: { userId_address: { userId: identity.userId, address: fromEmail } } }))
    : false
  const spam = isBlocked || !!opts.markSpam

  // Try to match to an existing thread via In-Reply-To header
  let thread = null
  if (inReplyTo) {
    const referencedMsg = await prisma.message.findFirst({
      where: { rawMessageId: inReplyTo },
      include: { thread: true },
    })
    // Only follow the reference within the same account — a seller must never get a reply
    // threaded into someone else's conversation.
    thread = referencedMsg?.thread?.userId === identity.userId ? referencedMsg.thread : null
  }

  // Fallback: same identity, same sender already in the thread, and an exact match
  // on the normalized subject (not `contains` — a short/common subject could
  // otherwise merge two unrelated conversations into one thread).
  if (!thread) {
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

  const ccEmails = ccAddress ? ccAddress.match(new RegExp(EMAIL_RE.source, 'g')) ?? [] : []

  // Create new thread if no match
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        subject,
        identityId: identity.id,
        userId: identity.userId,
        participants: [toEmail, fromEmail ?? fromAddress, ...ccEmails],
        lastAt: new Date(),
        status: spam ? 'spam' : 'open',
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

  return { threadId: thread.id, spam }
}
