import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { verifyMailRequest } from '../../../lib/inbound/signature'

// MX server → easonet, every minute: which domains and addresses do we accept mail for?
// The MX servers keep this in memory so the RCPT check never waits on the app, and keep using
// the last good copy if a refresh fails. /api/mail/ingest re-checks against the database.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  if ((await verifyMailRequest(req)) === null) return res.status(401).json({ error: 'Unauthorized' })

  const now = new Date()
  const domains = await prisma.mailDomain.findMany({ where: { inboundEnabled: true } })
  const identities = await prisma.identity.findMany({
    where: { domain: { in: domains.map(d => d.domain) } },
    select: { email: true, domain: true, userId: true, status: true, retiresAt: true },
  })

  const out: Record<string, { catchAll: boolean; addresses: string[] }> = {}
  for (const d of domains) {
    out[d.domain] = {
      catchAll: d.catchAll,
      addresses: identities
        .filter(i => i.domain === d.domain && i.userId === d.userId)
        .filter(i => i.status === 'active' || (i.status === 'retiring' && !!i.retiresAt && i.retiresAt > now))
        .map(i => i.email.toLowerCase().split('@')[0]),
    }
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ generatedAt: now.toISOString(), domains: out })
}
