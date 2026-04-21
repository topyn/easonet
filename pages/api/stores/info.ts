import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { slug } = req.query
  if (!slug) return res.status(400).json({ error: 'Slug required' })

  const store = await prisma.store.findUnique({
    where: { slug: String(slug) },
    select: {
      id: true, name: true, slug: true, description: true, active: true,
      products: {
        where: { active: true },
        select: { id: true, name: true, description: true, price: true, currency: true, type: true, imageUrl: true, stock: true },
        orderBy: { createdAt: 'asc' },
      },
      identity: { select: { name: true, color: true } },
    },
  })

  if (!store) return res.status(404).json({ error: 'Store not found' })
  return res.json(store)
}
