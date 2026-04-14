import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const { identityId } = req.query

  const threads = await prisma.thread.findMany({
    where: identityId ? { identityId: String(identityId) } : {},
    include: {
      identity: { select: { id: true, name: true, email: true, color: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastAt: 'desc' },
    take: 50,
  })

  return res.json(threads)
}
