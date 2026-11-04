// pages/api/ses/feedback.ts — SNS endpoint for Amazon SES bounce and complaint events
// (lib/sesFeedback.ts). SNS posts JSON with Content-Type text/plain; anything not signed by
// AWS for our topic is rejected.

import type { NextApiRequest, NextApiResponse } from 'next'
import { verifySns, handleSesEvent } from '../../../lib/sesFeedback'

export const config = { api: { bodyParser: { sizeLimit: '256kb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  let m: any
  try { m = typeof req.body === 'string' ? JSON.parse(req.body) : req.body } catch { return res.status(400).end() }
  if (!(await verifySns(m))) return res.status(403).end()

  if (m.Type === 'SubscriptionConfirmation') {
    // Confirm only the SNS-provided URL for our own topic (already signature-checked).
    const url = new URL(m.SubscribeURL)
    if (!/^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname)) return res.status(403).end()
    const r = await fetch(url.href, { signal: AbortSignal.timeout(8000) }).catch(() => null)
    console.log('ses feedback: subscription confirm', r?.status)
    return res.status(r?.ok ? 200 : 502).end()
  }
  if (m.Type !== 'Notification') return res.status(200).end()

  let event: any
  try { event = JSON.parse(m.Message) } catch { return res.status(200).end() }
  try {
    const done = await handleSesEvent(m.MessageId, event)
    console.log('ses feedback:', done)
    return res.status(200).end()
  } catch (e) {
    // A 5xx makes SNS retry later; the event is deduplicated by MessageId.
    console.error('ses feedback failed', e)
    return res.status(500).end()
  }
}
