import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { brevoSmtpConfig } from '../../../lib/mailer'
import { getUser } from '../../../lib/supabase-server'
import { TRIAL_DOMAIN_LIMIT } from '../../../lib/stripe'
import { z } from 'zod'

const CreateIdentitySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  color: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { identities: true },
  })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  if (req.method === 'GET') {
    const identities = await prisma.identity.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true,
        domain: true, color: true, dnsVerified: true, createdAt: true,
      },
    })
    return res.json(identities)
  }

  if (req.method === 'POST') {
    // Enforce trial domain limit
    const isTrial = dbUser.plan === 'trial'
    const trialExpired = dbUser.trialEndsAt && new Date() > dbUser.trialEndsAt
    if (trialExpired) return res.status(403).json({ error: 'Trial expired', code: 'TRIAL_EXPIRED' })
    if (isTrial && dbUser.identities.length >= TRIAL_DOMAIN_LIMIT) {
      return res.status(403).json({ error: 'Trial limit reached', code: 'UPGRADE_REQUIRED' })
    }

    const parsed = CreateIdentitySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const data = parsed.data
    const domain = data.email.split('@')[1]
    const smtp = brevoSmtpConfig()

    const identity = await prisma.identity.create({
      data: {
        userId: dbUser.id,
        name: data.name,
        email: data.email,
        domain,
        color: data.color ?? '#534AB7',
        smtpHost: smtp.smtpHost,
        smtpPort: smtp.smtpPort,
        smtpUser: smtp.smtpUser,
        smtpPass: smtp.smtpPass,
      },
    })

    return res.status(201).json({
      id: identity.id,
      name: identity.name,
      email: identity.email,
      domain: identity.domain,
      color: identity.color,
      dnsVerified: identity.dnsVerified,
    })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
