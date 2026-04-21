import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabase } from '../../../lib/supabase-server'
import { prisma } from '../../../lib/prisma'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' })

  const { email, password } = parsed.data
  const supabase = createServerSupabase(req, res)

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return res.status(401).json({ error: error.message })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: data.user.id },
    select: { id: true, email: true, plan: true, trialEndsAt: true },
  })

  return res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: dbUser,
  })
}
