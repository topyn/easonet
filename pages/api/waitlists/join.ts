import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'

const JoinSchema = z.object({
  slug: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Allow CORS for embed widget
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const parsed = JoinSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { slug, email, name } = parsed.data

  const waitlist = await prisma.waitlist.findUnique({
    where: { slug },
    select: { id: true, active: true, thankYouMsg: true, showCount: true },
  })

  if (!waitlist) return res.status(404).json({ error: 'Waitlist not found' })
  if (!waitlist.active) return res.status(400).json({ error: 'This waitlist is closed' })

  try {
    await prisma.waitlistSignup.create({
      data: { waitlistId: waitlist.id, email, name },
    })
  } catch (e: any) {
    if (e.code === 'P2002') {
      // Already signed up — return success anyway
      const count = await prisma.waitlistSignup.count({ where: { waitlistId: waitlist.id } })
      return res.json({ ok: true, alreadySignedUp: true, message: waitlist.thankYouMsg, count })
    }
    throw e
  }

  const count = await prisma.waitlistSignup.count({ where: { waitlistId: waitlist.id } })
  return res.json({ ok: true, message: waitlist.thankYouMsg, count })
}
