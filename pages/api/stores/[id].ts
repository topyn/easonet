import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'
import { z } from 'zod'

const ProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  type: z.enum(['digital', 'physical']),
  imageUrl: z.string().url().optional().or(z.literal('')),
  fileUrl: z.string().optional(),
  deliveryNote: z.string().optional(),
  stock: z.number().int().optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  const { id } = req.query
  const store = await prisma.store.findFirst({
    where: { id: String(id), userId: dbUser.id },
    include: {
      products: { where: { active: true }, orderBy: { createdAt: 'asc' } },
      orders: { orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true } } } },
      identity: { select: { name: true, color: true, email: true } },
    },
  })
  if (!store) return res.status(404).json({ error: 'Store not found' })

  if (req.method === 'GET') return res.json(store)

  if (req.method === 'POST') {
    const parsed = ProductSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const product = await prisma.product.create({
      data: { ...parsed.data, storeId: store.id, imageUrl: parsed.data.imageUrl || null },
    })
    return res.status(201).json(product)
  }

  if (req.method === 'DELETE') {
    await prisma.order.deleteMany({ where: { storeId: String(id) } })
    await prisma.product.deleteMany({ where: { storeId: String(id) } })
    await prisma.store.delete({ where: { id: String(id) } })
    return res.json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
  res.status(405).end()
}
