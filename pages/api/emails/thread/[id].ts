import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { prisma } from '../../../../lib/prisma'
import { getUser } from '../../../../lib/supabase-server'

const PatchSchema = z.object({
  read: z.boolean().optional(),
  status: z.enum(['open', 'archived', 'spam']).optional(),
  // Only meaningful alongside status:'spam' — also blocks the sender so future mail from
  // them is auto-routed to spam (see pages/api/inbound/receive.ts), and sweeps any of their
  // other open threads into spam right away.
  blockSender: z.boolean().optional(),
})

// The address a thread's spam/block action applies to — derived from the thread's own first
// inbound message rather than trusted from the client, since ownership of the thread (checked
// by the caller) is what authorises this, not an arbitrary client-supplied address.
async function getThreadSenderAddress(threadId: string): Promise<string | null> {
  const firstInbound = await prisma.message.findFirst({
    where: { threadId, direction: 'inbound' },
    orderBy: { createdAt: 'asc' },
    select: { fromAddress: true },
  })
  return firstInbound?.fromAddress.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0]?.toLowerCase() ?? null
}

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

    const before = await prisma.thread.findUnique({ where: { id: owned.id }, select: { status: true } })

    const { blockSender, ...threadUpdate } = parsed.data
    const thread = await prisma.thread.update({ where: { id: owned.id }, data: threadUpdate })

    // Marking as spam blocks the sender for future mail and sweeps their other open threads
    // into spam right away — that's the actual point of the action, not just this one thread.
    if (parsed.data.status === 'spam' && blockSender) {
      const addr = await getThreadSenderAddress(owned.id)
      if (addr) {
        await prisma.blockedSender.upsert({
          where: { userId_address: { userId: dbUser.id, address: addr } },
          create: { userId: dbUser.id, address: addr },
          update: {},
        })
        await prisma.thread.updateMany({
          where: { userId: dbUser.id, status: 'open', participants: { has: addr }, id: { not: owned.id } },
          data: { status: 'spam' },
        })
      }
    }

    // Explicitly un-spamming a thread also unblocks the sender, so future mail from them
    // stops being auto-routed to spam — the reverse of the block above.
    if (parsed.data.status === 'open' && before?.status === 'spam') {
      const addr = await getThreadSenderAddress(owned.id)
      if (addr) await prisma.blockedSender.deleteMany({ where: { userId: dbUser.id, address: addr } })
    }

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
