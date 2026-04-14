import { createServerClient } from '@supabase/ssr'
import { NextApiRequest, NextApiResponse } from 'next'

export function createServerSupabase(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.entries(req.cookies).map(([name, value]) => ({
            name,
            value: value ?? '',
          }))
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
          })
        },
      },
    }
  )
}

// Get the current user from a request, returns null if not authed
export async function getUser(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabase(req, res)
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
