import type { NextApiRequest, NextApiResponse } from 'next'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { verifyMailRequest } from '../../../lib/inbound/signature'
import { MAX_RAW_BYTES, rawStorage } from '../../../lib/inbound/raw'

// MX server → easonet: "I have a message of this size, where do I put it?"
// Returns a one-time signed upload URL in the private inbound-raw bucket.

export const config = { api: { bodyParser: false } }

const Body = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().positive().max(MAX_RAW_BYTES),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const raw = await verifyMailRequest(req)
  if (raw === null) return res.status(401).json({ error: 'Unauthorized' })

  let json: unknown
  try { json = JSON.parse(raw) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  const parsed = Body.safeParse(json)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' })

  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  const path = `raw/${day}/${parsed.data.sha256}-${randomUUID()}.eml`
  const { data, error } = await rawStorage().createSignedUploadUrl(path)
  if (error || !data) {
    console.error('MAIL upload-url error:', error?.message)
    return res.status(503).json({ error: 'Storage unavailable' })
  }
  return res.status(200).json({ path, signedUrl: data.signedUrl })
}
