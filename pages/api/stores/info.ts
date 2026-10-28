import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { accountActive } from '../../../lib/plan'

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
      user: { select: { plan: true, trialEndsAt: true } },
    },
  })

  if (!store || !store.active) return res.status(404).json({ error: 'Store not found' })
  const { user, ...publicStore } = store
  if (!accountActive(user)) return res.status(404).json({ error: 'This store is paused' })
  return res.json(publicStore)
}
