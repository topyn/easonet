import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/supabase-server'

const PatchSchema = z.object({
  read: z.boolean().optional(),
  status: z.enum(['open', 'archived']).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', ['GET', 'PATCH'])
    return res.status(405).end()
  }

  const authUser = await getUser(req, res)
  if (!authUser) return res.status(401).json({ error: 'Not authenticated' })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!dbUser) return res.status(404).json({ error: 'User not found' })

  const { id } = req.query

  const owned = await prisma.thread.findFirst({ where: { id: String(id) }, select: { id: true, userId: true } })
  if (!owned || owned.userId !== dbUser.id) return res.status(404).json({ error: 'Thread not found' })

  if (req.method === 'PATCH') {
    const parsed = PatchSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    if (Object.keys(parsed.data).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const thread = await prisma.thread.update({ where: { id: owned.id }, data: parsed.data })
    return res.json(thread)
  }

  const thread = await prisma.thread.findFirst({
    where: { id: owned.id },
    include: {
      identity: { select: { id: true, name: true, email: true, color: true } },
      messages: { orderBy: { createdAt: 'asc' }, include: { attachments: true } },
    },
  })

  await prisma.thread.update({ where: { id: owned.id }, data: { read: true } })

  return res.json(thread)
}
