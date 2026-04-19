import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  res.setHeader('Access-Control-Allow-Origin', '*')

  const { slug } = req.query
  if (!slug) return res.status(400).json({ error: 'Slug required' })

  const waitlist = await prisma.waitlist.findUnique({
    where: { slug: String(slug) },
    select: {
      id: true, name: true, slug: true, headline: true,
      description: true, buttonText: true, showCount: true, active: true,
      _count: { select: { signups: true } },
    },
  })

  if (!waitlist) return res.status(404).json({ error: 'Not found' })
  return res.json({ ...waitlist, count: waitlist._count.signups })
}
