import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabase, getUser } from '../../../lib/supabase-server'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabase(req, res)

  if (req.method === 'DELETE') {
    await supabase.auth.signOut()
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    const user = await getUser(req, res)
    if (!user) return res.status(401).json({ error: 'Not authenticated' })

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true, email: true, plan: true, trialEndsAt: true },
    })

    return res.status(200).json({ user: dbUser })
  }

  res.setHeader('Allow', ['GET', 'DELETE'])
  res.status(405).end()
}
