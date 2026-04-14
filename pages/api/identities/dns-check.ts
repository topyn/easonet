import type { NextApiRequest, NextApiResponse } from 'next'
import { getUser } from '../../../lib/supabase-server'
import { checkDnsRecords } from '../../../lib/dns-check'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'

const Schema = z.object({ domain: z.string().min(3) })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const user = await getUser(req, res)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })

  const parsed = Schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid domain' })

  const { domain } = parsed.data
  const result = await checkDnsRecords(domain)

  // If both records are present, mark the identity as verified
  if (result.mx && result.spf) {
    await prisma.identity.updateMany({
      where: { domain, user: { supabaseId: user.id } },
      data: { dnsVerified: true },
    })
  }

  return res.status(200).json(result)
}
