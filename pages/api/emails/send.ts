import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { sendFromIdentity } from '../../../lib/mailer'
import { getUser } from '../../../lib/supabase-server'
import { signAttachmentUrl } from '../../../lib/storage'
import { z } from 'zod'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseEmailList(raw?: string): string[] {
  if (!raw) return []
  return raw.split(/[,;]/).map(s => s.trim()).filter(Boolean)
}

// A freshly-uploaded attachment carries `path`; a forwarded one carries `attachmentId`
// so ownership is re-verified against the DB instead of trusting a client-supplied path.
const AttachmentRefSchema = z.object({
  path: z.string().min(1).optional(),
  attachmentId: z.string().min(1).optional(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
}).refine(a => !!a.path !== !!a.attachmentId, { message: 'Provide exactly one of path or attachmentId' })

const SendSchema = z.object({
  identityId: z.string(),
  to: z.string().min(1),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().optional(),
  threadId: z.string().optional(),
  attachments: z.array(AttachmentRefSchema).max(10).optional().default([]),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  try {
    const authUser = await getUser(req, res)
    if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
    if (!dbUser) return res.status(404).json({ error: 'User not found' })

    const parsed = SendSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { identityId, to, cc, bcc, subject, text, html, threadId, attachments } = parsed.data

    const identity = await prisma.identity.findUnique({ where: { id: identityId } })
    if (!identity || identity.userId !== dbUser.id) return res.status(404).json({ error: 'Identity not found' })

    const toList = parseEmailList(to)
    const ccList = parseEmailList(cc)
    const bccList = parseEmailList(bcc)
    if (toList.length === 0 || [...toList, ...ccList, ...bccList].some(a => !EMAIL_RE.test(a))) {
      return res.status(400).json({ error: 'One or more recipient addresses are invalid' })
    }
    const toJoined = toList.join(', ')
    const ccJoined = ccList.join(', ')
    const bccJoined = bccList.join(', ')

    // Resolve each attachment to a verified storage path. Freshly-uploaded ones must
    // live under this user's own upload prefix; forwarded ones are re-checked against
    // the DB (the message they came from must belong to a thread this user owns) —
    // either way we never trust a client-supplied path we haven't verified ownership of.
    const resolvedAttachments: { filename: string; mimeType: string; size: number; storagePath: string }[] = []
    for (const a of attachments) {
      if (a.attachmentId) {
        const existing = await prisma.attachment.findFirst({
          where: { id: a.attachmentId },
          include: { message: { include: { thread: true } } },
        })
        if (!existing || existing.message.thread.userId !== dbUser.id) {
          return res.status(403).json({ error: 'Invalid attachment reference' })
        }
        resolvedAttachments.push({ filename: existing.filename, mimeType: existing.mimeType, size: existing.size, storagePath: existing.storagePath })
      } else {
        if (!a.path!.startsWith(`${dbUser.id}/`)) {
          return res.status(403).json({ error: 'Invalid attachment reference' })
        }
        resolvedAttachments.push({ filename: a.filename, mimeType: a.mimeType, size: a.size, storagePath: a.path! })
      }
    }

    const mailAttachments = await Promise.all(resolvedAttachments.map(async a => ({
      filename: a.filename,
      contentType: a.mimeType,
      path: await signAttachmentUrl(req, res, a.storagePath, 300),
    })))

    let inReplyTo: string | undefined
    let references: string | undefined
    let thread = threadId ? await prisma.thread.findUnique({
      where: { id: threadId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    }) : null

    if (thread) {
      const lastMsg = thread.messages.at(-1)
      if (lastMsg?.rawMessageId) {
        inReplyTo = lastMsg.rawMessageId
        const allIds = thread.messages.map(m => m.rawMessageId).filter(Boolean).join(' ')
        references = allIds
      }
    }

    const messageId = await sendFromIdentity({ identity, to: toJoined, cc: ccJoined || undefined, bcc: bccJoined || undefined, subject, text, html, attachments: mailAttachments, inReplyTo, references })

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          subject,
          identityId,
          userId: dbUser.id,
          participants: [identity.email, ...toList, ...ccList],
          lastAt: new Date(),
        },
        include: { messages: true },
      })
    } else {
      await prisma.thread.update({ where: { id: thread.id }, data: { lastAt: new Date() } })
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        direction: 'outbound',
        fromAddress: identity.email,
        toAddress: toJoined,
        ccAddress: ccJoined || null,
        bccAddress: bccJoined || null,
        subject,
        bodyText: text,
        bodyHtml: html,
        rawMessageId: messageId,
        sentByIdentityId: identityId,
      },
    })

    if (resolvedAttachments.length > 0) {
      await prisma.attachment.createMany({
        data: resolvedAttachments.map(a => ({
          messageId: message.id,
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
          storagePath: a.storagePath,
        })),
      })
    }

    return res.status(201).json({ messageId: message.id, threadId: thread.id })

  } catch (err: any) {
    console.error('SEND ERROR:', err.message)
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
