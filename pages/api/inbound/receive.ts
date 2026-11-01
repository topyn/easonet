import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { simpleParser } from 'mailparser'
import { firstEmail, storeInboundEmail } from '../../../lib/inbound/store'

// Cloudflare Email Routing webhook (Mark's own domains). Seller domains on our own MX servers
// arrive via /api/mail/ingest instead.

// Disable body parsing - we need the raw email payload
export const config = { api: { bodyParser: false } }

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }

  // Verify webhook secret to prevent spoofing
  const secret = req.headers['x-webhook-secret']
  if (secret !== process.env.INBOUND_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const rawBody = await getRawBody(req)
    const parsed = await simpleParser(rawBody)

    // Match the "to" address to an identity
    const to = parsed.to ? (Array.isArray(parsed.to) ? parsed.to[0] : parsed.to).text : ''
    const toEmail = firstEmail(to)
    if (!toEmail) return res.status(400).json({ error: 'Could not parse To address' })

    const identity = await prisma.identity.findUnique({ where: { email: toEmail } })
    if (!identity) {
      // Unknown alias - store anyway under a catch-all log, or just drop
      console.warn('Inbound email to unknown alias:', toEmail)
      return res.status(200).json({ ok: true, note: 'unknown alias, dropped' })
    }

    const { threadId } = await storeInboundEmail({ req, res, parsed, identity })
    return res.status(200).json({ ok: true, threadId })
  } catch (err) {
    console.error('Inbound parse error:', err)
    return res.status(500).json({ error: 'Failed to process inbound email' })
  }
}
