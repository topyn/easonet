import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  const { id } = req.query
  const waitlist = await prisma.waitlist.findFirst({
    where: { id: String(id), userId: dbUser.id },
    include: {
      signups: { orderBy: { createdAt: 'desc' } },
      identity: { select: { name: true, color: true, email: true } },
      _count: { select: { signups: true } },
    },
  })
  if (!waitlist) return res.status(404).json({ error: 'Not found' })

  if (req.method === 'GET') return res.json(waitlist)

  if (req.method === 'DELETE') {
    await prisma.waitlistSignup.deleteMany({ where: { waitlistId: String(id) } })
    await prisma.waitlist.delete({ where: { id: String(id) } })
    return res.json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'DELETE'])
  res.status(405).end()
}
