import type { NextApiRequest, NextApiResponse } from 'next'
import { createHash } from 'crypto'
import { simpleParser } from 'mailparser'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { verifyMailRequest } from '../../../lib/inbound/signature'
import { rawStorage } from '../../../lib/inbound/raw'
import { resolveRecipient } from '../../../lib/inbound/routing'
import { storeInboundEmail } from '../../../lib/inbound/store'

// MX server → easonet, after uploading the raw message: file it for each envelope recipient.
// The MX server only answers "250 OK" to the sending server once this returns 200, so any
// failure here (500) becomes a "451 try again later" and nothing is lost. Each
// (message, recipient) pair is recorded in InboundReceipt so retries never store twice.

export const config = { api: { bodyParser: false } }

const Body = z.object({
  path: z.string().regex(/^raw\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]{64}-[0-9a-f-]{36}\.eml$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  mailFrom: z.string().max(320),
  rcptTo: z.array(z.string().max(320)).min(1).max(50),
  remoteAddress: z.string().max(64).optional(),
  auth: z.object({
    spf: z.string().optional(),
    dkim: z.string().optional(),
    dmarc: z.string().optional(),
  }).optional(),
  spam: z.object({ score: z.number().optional(), action: z.enum(['accept', 'spam']) }).optional(),
})

type Result = { rcpt: string; result: 'stored' | 'spam' | 'duplicate' | 'rejected'; threadId?: string }

// A claim older than this belongs to an attempt that died (function timeout) — retake it.
const PENDING_STALE_MS = 2 * 60 * 1000
class RetryLater extends Error {}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const raw = await verifyMailRequest(req)
  if (raw === null) return res.status(401).json({ error: 'Unauthorized' })

  let json: unknown
  try { json = JSON.parse(raw) } catch { return res.status(400).json({ error: 'Invalid JSON' }) }
  const parsedBody = Body.safeParse(json)
  if (!parsedBody.success) return res.status(400).json({ error: 'Invalid request' })
  const body = parsedBody.data

  try {
    const { data: blob, error } = await rawStorage().download(body.path)
    if (error || !blob) throw new Error(`download failed: ${error?.message}`)
    const eml = Buffer.from(await blob.arrayBuffer())
    if (createHash('sha256').update(eml).digest('hex') !== body.sha256) {
      return res.status(400).json({ error: 'Checksum mismatch' })
    }

    const parsed = await simpleParser(eml)
    const markSpam = body.spam?.action === 'spam'
    const results: Result[] = []

    for (const rcptRaw of Array.from(new Set(body.rcptTo.map(r => r.toLowerCase())))) {
      const key = { rawSha256: body.sha256, envelopeTo: rcptRaw }
      const existing = await prisma.inboundReceipt.findUnique({ where: { rawSha256_envelopeTo: key } })
      if (existing && existing.result !== 'pending') {
        results.push({ rcpt: rcptRaw, result: 'duplicate', threadId: existing.threadId ?? undefined })
        continue
      }
      if (existing) {
        // Another delivery is mid-flight (or died mid-flight). Recent: make the MX server retry
        // later. Stale: the earlier attempt crashed without releasing its claim, so retake it.
        if (Date.now() - existing.receivedAt.getTime() < PENDING_STALE_MS) throw new RetryLater()
        await prisma.inboundReceipt.delete({ where: { rawSha256_envelopeTo: key } })
      }

      const identity = await resolveRecipient(rcptRaw)
      if (!identity) {
        await prisma.inboundReceipt.upsert({
          where: { rawSha256_envelopeTo: key },
          create: { ...key, storagePath: body.path, result: 'rejected' },
          update: { result: 'rejected' },
        })
        results.push({ rcpt: rcptRaw, result: 'rejected' })
        continue
      }

      // Claim the pair first so a concurrent retry from the other MX server can't store it too.
      try {
        await prisma.inboundReceipt.create({ data: { ...key, storagePath: body.path, result: 'pending' } })
      } catch (e: any) {
        if (e.code === 'P2002') throw new RetryLater()
        throw e
      }

      try {
        const { threadId, spam } = await storeInboundEmail({ req, res, parsed, identity, markSpam })
        await prisma.inboundReceipt.update({
          where: { rawSha256_envelopeTo: key },
          data: { threadId, result: spam ? 'spam' : 'stored' },
        })
        results.push({ rcpt: rcptRaw, result: spam ? 'spam' : 'stored', threadId })
      } catch (e) {
        // Release the claim so the MX server's retry can deliver it.
        await prisma.inboundReceipt.delete({ where: { rawSha256_envelopeTo: key } }).catch(() => {})
        throw e
      }
    }

    return res.status(200).json({ ok: true, results })
  } catch (err: any) {
    if (err instanceof RetryLater) return res.status(409).json({ error: 'Delivery in progress, retry later' })
    console.error('MAIL ingest error:', err?.message)
    return res.status(500).json({ error: 'Ingest failed' })
  }
}
