import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { sendFromIdentity } from '../../lib/mailer'
import { rateLimit, clientIp } from '../../lib/rateLimit'
import { z } from 'zod'

// Register-interest form for the easonet web-shop service (/register). Each sign-up is
// kept on a waitlist owned by mark@easonet.com (visible under /waitlists) and dropped into
// that inbox as a thread with the full details, plus an email notification.

const WAITLIST_SLUG = 'easonet-webshops'

const InterestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  business: z.string().trim().max(120).optional().default(''),
  website: z.string().trim().max(200).optional().default(''),
  sells: z.string().trim().max(1000).optional().default(''),
  company: z.string().optional(), // honeypot
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!rateLimit(`interest:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests — please wait a few minutes and try again' })
  }

  const parsed = InterestSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Please add your name and a valid email address' })

  const { name, email, business, website, sells, company } = parsed.data
  // Bots fill every field; pretend it worked so they don't retry.
  if (company) return res.status(200).json({ ok: true })

  try {
    const identity = await prisma.identity.findFirst({ where: { email: 'mark@easonet.com' } })
    if (!identity) {
      console.error('INTEREST ERROR: mark@easonet.com identity not found')
      return res.status(503).json({ error: 'Sign-ups are briefly unavailable — please try again later' })
    }

    const waitlist = await prisma.waitlist.upsert({
      where: { slug: WAITLIST_SLUG },
      update: {},
      create: {
        userId: identity.userId,
        identityId: identity.id,
        slug: WAITLIST_SLUG,
        name: 'easonet web shops — register interest',
        headline: 'Register your interest',
        thankYouMsg: "Thanks — you're on the list. We'll be in touch personally.",
        showCount: false,
      },
    })

    let repeat = false
    try {
      await prisma.waitlistSignup.create({ data: { waitlistId: waitlist.id, email: email.toLowerCase(), name } })
    } catch (e: any) {
      if (e.code !== 'P2002') throw e
      repeat = true
    }

    const subject = `${repeat ? 'Updated' : 'New'} web-shop interest: ${business || name}`
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Business: ${business || '—'}`,
      `Current website/domain: ${website || '—'}`,
      '',
      'What they sell:',
      sells || '—',
    ].join('\n')

    const thread = await prisma.thread.create({
      data: {
        subject,
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
        subject,
        bodyText: body,
      },
    })

    try {
      await sendFromIdentity({ identity, to: identity.email, subject, text: `${body}\n\n---\nReply to ${email} to get in touch.` })
    } catch (e: any) {
      // The thread is already in the inbox, so a failed notification shouldn't fail the sign-up.
      console.error('INTEREST NOTIFY ERROR:', e.message)
    }

    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('INTEREST ERROR:', err.message)
    return res.status(500).json({ error: 'Something went wrong — please try again' })
  }
}
