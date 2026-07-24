import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'

const PAGE_SIZE = 30

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  const { identityId, cursor, q, status } = req.query

  const where = {
    userId: dbUser.id,
    status: status === 'archived' ? 'archived' : 'open',
    ...(identityId ? { identityId: String(identityId) } : {}),
    ...(q ? {
      OR: [
        { subject: { contains: String(q), mode: 'insensitive' as const } },
        { participants: { has: String(q) } },
      ],
    } : {}),
  }

  const threads = await prisma.thread.findMany({
    where,
    include: {
      identity: { select: { id: true, name: true, email: true, color: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { _count: { select: { attachments: true } } },
      },
    },
    orderBy: { lastAt: 'desc' },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: String(cursor) }, skip: 1 } : {}),
  })

  const hasMore = threads.length > PAGE_SIZE
  const page = hasMore ? threads.slice(0, PAGE_SIZE) : threads
  const nextCursor = hasMore ? page[page.length - 1].id : null

  return res.json({ threads: page, nextCursor })
}
