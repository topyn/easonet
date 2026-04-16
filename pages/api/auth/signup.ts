import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabase } from '../../../lib/supabase-server'
import { prisma } from '../../../lib/prisma'
import { TRIAL_DAYS } from '../../../lib/stripe'
import { z } from 'zod'

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const parsed = SignupSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

    const { email, password } = parsed.data
    const supabase = createServerSupabase(req, res)

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return res.status(400).json({ error: error.message })
    if (!data.user) return res.status(500).json({ error: 'User creation failed' })

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS)

    await prisma.user.upsert({
      where: { supabaseId: data.user.id },
      create: {
        supabaseId: data.user.id,
        email,
        plan: 'trial',
        trialEndsAt,
      },
      update: {},
    })

    return res.status(201).json({ ok: true })

  } catch (err: any) {
    console.error('SIGNUP ERROR:', err)
    return res.status(500).json({ error: err.message ?? 'Unknown error' })
  }
}