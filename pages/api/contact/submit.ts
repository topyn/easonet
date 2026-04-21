import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { sendFromIdentity } from '../../../lib/mailer'
import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  res.setHeader('Access-Control-Allow-Origin', '*')

  const parsed = ContactSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Please fill in all fields correctly' })

  const { name, email, message } = parsed.data

  try {
    // Find the easonet identity to send from
    const identity = await prisma.identity.findFirst({
      where: { email: 'mark@easonet.com' },
    })

    if (identity) {
      // Create a thread in the inbox
      const thread = await prisma.thread.create({
        data: {
          subject: `Contact form: ${name}`,
          identityId: identity.id,
          userId: identity.userId,
          participants: [identity.email, email],
          lastAt: new Date(),
        },
      })

      await prisma.message.create({
        data: {
          threadId: thread.id,
          direction: 'inbound',
          fromAddress: `${name} <${email}>`,
          toAddress: identity.email,
          subject: `Contact form: ${name}`,
          bodyText: `From: ${name}\nEmail: ${email}\n\n${message}`,
        },
      })

      // Send email notification
      await sendFromIdentity({
        identity,
        to: identity.email,
        subject: `New contact from ${name}`,
        text: `You have a new contact form submission.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\n---\nReply directly to this email to respond.`,
      })
    }

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('CONTACT ERROR:', err.message)
    return res.status(500).json({ error: 'Something went wrong — please try again' })
  }
}
