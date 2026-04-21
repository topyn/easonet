import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { getUser } from '../../../lib/supabase-server'
import { z } from 'zod'

const CreateSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  tagline: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  accentColor: z.string().default('#7B6EF6'),
  bgStyle: z.enum(['dark', 'light']).default('dark'),
  fontStyle: z.enum(['modern', 'classic']).default('modern'),
  customDomain: z.string().optional(),
  identityId: z.string().optional(),
  storeId: z.string().optional(),
  waitlistId: z.string().optional(),
  links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  sections: z.array(z.object({ title: z.string(), content: z.string() })).default([]),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })
  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  if (req.method === 'GET') {
    const pages = await prisma.brandPage.findMany({
      where: { userId: dbUser.id },
      include: { identity: { select: { name: true, color: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(pages)
  }

  if (req.method === 'POST') {
    const parsed = CreateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const existing = await prisma.brandPage.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) return res.status(400).json({ error: 'That slug is already taken' })
    const data = parsed.data
    const page = await prisma.brandPage.create({
      data: {
        ...data,
        userId: dbUser.id,
        storeId: data.storeId || null,
        waitlistId: data.waitlistId || null,
        identityId: data.identityId || null,
        customDomain: data.customDomain || null,
      },
    })
    return res.status(201).json(page)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
