import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'
import { z } from 'zod'

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  identityId: z.string().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  if (req.method === 'GET') {
    const stores = await prisma.store.findMany({
      where: { userId: dbUser.id },
      include: {
        _count: { select: { products: true, orders: true } },
        identity: { select: { name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(stores)
  }

  if (req.method === 'POST') {
    const parsed = CreateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const existing = await prisma.store.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) return res.status(400).json({ error: 'That URL slug is already taken' })
    const store = await prisma.store.create({
      data: { ...parsed.data, userId: dbUser.id },
    })
    return res.status(201).json(store)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
