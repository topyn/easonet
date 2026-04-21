import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { refresh_token } = req.body
  if (!refresh_token) return res.status(400).json({ error: 'No refresh token' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.auth.refreshSession({ refresh_token })
  if (error || !data.session) return res.status(401).json({ error: 'Session expired' })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: data.user!.id },
    select: { id: true, email: true, plan: true, trialEndsAt: true },
  })

  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: dbUser,
  })
}
