import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

  const { id } = req.query

  const thread = await prisma.thread.findFirst({
    where: {
      id: String(id),
      user: { supabaseId: authUser.id },
    },
    include: {
      identity: { select: { id: true, name: true, email: true, color: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!thread) return res.status(404).json({ error: 'Thread not found' })

  // Mark thread as read
  await prisma.thread.update({ where: { id: thread.id }, data: { read: true } })

  return res.json(thread)
}
