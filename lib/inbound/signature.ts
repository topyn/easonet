import type { NextApiRequest } from 'next'
import { createHmac, timingSafeEqual } from 'crypto'

// Requests between our MX servers (mx/ in this repo) and easonet are signed with a shared
// secret: HMAC-SHA256 over "<unix seconds>.<METHOD>.<path>.<raw body>". Signing the path
// stops a captured request being replayed against another endpoint; the timestamp window
// stops it being replayed later. Keep in step with mx/src/easonet.mjs.

export const TS_HEADER = 'x-easonet-timestamp'
export const SIG_HEADER = 'x-easonet-signature'
const MAX_SKEW_SECONDS = 300

export function signMailRequest(secret: string, ts: number, method: string, path: string, body: string): string {
  return createHmac('sha256', secret).update(`${ts}.${method.toUpperCase()}.${path}.${body}`).digest('hex')
}

export async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** Returns the raw body when the request is correctly signed, otherwise null. */
export async function verifyMailRequest(req: NextApiRequest): Promise<string | null> {
  const secret = process.env.MAIL_HMAC_SECRET
  if (!secret || secret.length < 32) {
    console.error('MAIL_HMAC_SECRET is not set (or too short) — refusing MX requests')
    return null
  }
  const ts = Number(req.headers[TS_HEADER])
  const sig = String(req.headers[SIG_HEADER] || '')
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return null

  const body = req.method === 'GET' ? '' : (await readRawBody(req)).toString('utf8')
  const path = (req.url || '').split('?')[0]
  const expected = Buffer.from(signMailRequest(secret, ts, req.method || 'GET', path, body), 'hex')
  const given = Buffer.from(sig, 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  return body
}
