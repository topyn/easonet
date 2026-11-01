import { createClient } from '@supabase/supabase-js'

// Raw .eml files from our MX servers. They upload straight to this private bucket with a
// one-time signed URL (so the MX servers never hold a Supabase key) and then post a small
// pointer to /api/mail/ingest — Vercel functions reject request bodies over 4.5 MB, and
// email with photos is often bigger than that.

export const RAW_BUCKET = 'inbound-raw'
export const MAX_RAW_BYTES = 25 * 1024 * 1024 // matches the MX servers' SIZE limit

export function rawStorage() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .storage.from(RAW_BUCKET)
}
