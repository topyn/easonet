import type { NextApiRequest } from 'next'

// In-memory, best-effort only: a Vercel serverless function isn't guaranteed to
// reuse the same warm instance (or memory) across requests, so this doesn't stop a
// determined distributed attacker. It does close the "spam a public form from one
// browser tab" class of abuse at zero added infra.
const buckets = new Map<string, { count: number; resetAt: number }>()

function cleanup(now: number) {
  if (buckets.size < 5000) return
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key)
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  cleanup(now)
  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count++
  return true
}

export function clientIp(req: NextApiRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0].trim()
  if (Array.isArray(fwd)) return fwd[0]
  return req.socket?.remoteAddress ?? 'unknown'
}
