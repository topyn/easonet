import { createClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'

export function createServerSupabase(_req: NextApiRequest, _res: NextApiResponse) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getUser(req: NextApiRequest, _res: NextApiResponse) {
  try {
    // Try Bearer token from Authorization header first
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) return user
    }
    return null
  } catch {
    return null
  }
}