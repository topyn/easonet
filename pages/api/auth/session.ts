import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(200).json({ user: null })
      }

      const token = authHeader.replace('Bearer ', '')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return res.status(200).json({ user: null })

      const dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
        select: { id: true, email: true, plan: true, trialEndsAt: true },
      })

      return res.status(200).json({ user: dbUser })
    } catch (err: any) {
      return res.status(200).json({ user: null })
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE'])
  res.status(405).end()
}
