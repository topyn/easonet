import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { sendFromIdentity } from '../../../lib/mailer'
import { z } from 'zod'

const SendSchema = z.object({
  identityId: z.string(),
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().optional(),
  threadId: z.string().optional(), // if replying to existing thread
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  const parsed = SendSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { identityId, to, subject, text, html, threadId } = parsed.data

  const identity = await prisma.identity.findUnique({ where: { id: identityId } })
  if (!identity) return res.status(404).json({ error: 'Identity not found' })

  // If replying, fetch last message for threading headers
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
      const allIds = thread.messages
        .map(m => m.rawMessageId)
        .filter(Boolean)
        .join(' ')
      references = allIds
    }
  }

  // Send the email
  const messageId = await sendFromIdentity({
    identity,
    to,
    subject,
    text,
    html,
    inReplyTo,
    references,
  })

  // Upsert thread
  if (!thread) {
    thread = await prisma.thread.create({
      data: {
        subject,
        identityId,
        participants: [identity.email, to],
        lastAt: new Date(),
      },
      include: { messages: true },
    })
  } else {
    await prisma.thread.update({
      where: { id: thread.id },
      data: { lastAt: new Date() },
    })
  }

  // Store the outbound message
  const message = await prisma.message.create({
    data: {
      threadId: thread.id,
      direction: 'outbound',
      fromAddress: identity.email,
      toAddress: to,
      subject,
      bodyText: text,
      bodyHtml: html,
      rawMessageId: messageId,
      sentByIdentityId: identityId,
    },
  })

  return res.status(201).json({ messageId: message.id, threadId: thread.id })
}
