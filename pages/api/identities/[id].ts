import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'

const PatchSchema = z.object({
  signature: z.string().max(2000).nullable().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).end()
  }

  try {
    const authUser = await getUser(req, res)
    if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
    if (!dbUser) return res.status(404).json({ error: 'User not found' })

    const { id } = req.query
    const existing = await prisma.identity.findFirst({ where: { id: String(id) }, select: { id: true, userId: true } })
    if (!existing || existing.userId !== dbUser.id) return res.status(404).json({ error: 'Identity not found' })

    const parsed = PatchSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const identity = await prisma.identity.update({
      where: { id: existing.id },
      data: parsed.data,
      select: { id: true, name: true, email: true, domain: true, color: true, dnsVerified: true, signature: true },
    })

    return res.json(identity)
  } catch (err: any) {
    console.error('IDENTITY PATCH ERROR:', err.message)
    return res.status(500).json({ error: 'Failed to update identity' })
  }
}
