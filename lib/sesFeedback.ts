// lib/sesFeedback.ts — Amazon SES bounce and complaint handling.
//
// SES (Sydney, configuration set "easonet-default") publishes Bounce and Complaint events to
// the SNS topic easonet-ses-feedback, which posts them to /api/ses/feedback. Here we:
//   1. check the SNS message really came from AWS (signature + our topic only),
//   2. record each event once (SesFeedbackEvent, keyed by SNS MessageId),
//   3. suppress the address (SuppressedAddress) — permanent bounces and every complaint,
//   4. pause a customer's sending domain (MailDomain.sendingPaused) when its complaints or hard
//      bounces cross the limits below, so one customer can't hurt everyone's reputation.
// Transient (soft) bounces are recorded but don't suppress the address.

import crypto from 'crypto'
import { prisma } from './prisma'

export const FEEDBACK_TOPIC_ARN = process.env.SES_FEEDBACK_TOPIC_ARN || 'arn:aws:sns:ap-southeast-2:690473803657:easonet-ses-feedback'

// Pause a sending domain at 2 complaints in 30 days, or 10 permanent bounces in 24 hours.
const COMPLAINT_LIMIT = { count: 2, days: 30 }
const BOUNCE_LIMIT = { count: 10, hours: 24 }

type SnsMessage = {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation'
  MessageId: string; TopicArn: string; Message: string; Timestamp: string
  Subject?: string; SubscribeURL?: string; Token?: string
  SignatureVersion: string; Signature: string; SigningCertURL: string
}

const certCache = new Map<string, string>()

// https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
export async function verifySns(m: SnsMessage): Promise<boolean> {
  if (!m || m.TopicArn !== FEEDBACK_TOPIC_ARN) return false
  let cert: URL
  try { cert = new URL(m.SigningCertURL) } catch { return false }
  if (cert.protocol !== 'https:' || !/^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(cert.hostname) || !cert.pathname.endsWith('.pem')) return false
  const keys = m.Type === 'Notification'
    ? ['Message', 'MessageId', ...(m.Subject !== undefined ? ['Subject'] : []), 'Timestamp', 'TopicArn', 'Type']
    : ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']
  const toSign = keys.map(k => `${k}\n${(m as any)[k]}\n`).join('')
  let pem = certCache.get(cert.href)
  if (!pem) {
    const r = await fetch(cert.href, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return false
    pem = await r.text()
    certCache.set(cert.href, pem)
  }
  const algo = m.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1'
  try {
    return crypto.createVerify(algo).update(toSign, 'utf8').verify(pem, m.Signature, 'base64')
  } catch { return false }
}

function domainOf(address: string | undefined): string | null {
  const m = /@([^>\s]+)>?\s*$/.exec(String(address || ''))
  return m ? m[1].toLowerCase() : null
}

// One SES event (the parsed SNS Message). Returns what was done, for the log.
export async function handleSesEvent(messageId: string, event: any): Promise<string> {
  const type: string = event?.eventType || event?.notificationType // configuration-set events use eventType
  if (type !== 'Bounce' && type !== 'Complaint') return `ignored ${type}`
  const sourceDomain = domainOf(event?.mail?.source)
  const isBounce = type === 'Bounce'
  const permanent = isBounce && event?.bounce?.bounceType === 'Permanent'
  const people: string[] = (isBounce ? event?.bounce?.bouncedRecipients : event?.complaint?.complainedRecipients || [])
    ?.map((r: any) => String(r?.emailAddress || '').toLowerCase()).filter(Boolean) || []

  // Once per SNS message: a redelivery is a no-op.
  try {
    await prisma.sesFeedbackEvent.create({ data: { id: messageId, type, sourceDomain, recipients: people } })
  } catch (e: any) {
    if (e?.code === 'P2002') return 'duplicate'
    throw e
  }

  const suppress = !isBounce || permanent
  const detail = isBounce ? `${event?.bounce?.bounceType || ''}/${event?.bounce?.bounceSubType || ''}` : (event?.complaint?.complaintFeedbackType || 'complaint')
  if (suppress) {
    for (const email of people) {
      await prisma.suppressedAddress.upsert({
        where: { email },
        create: { email, reason: isBounce ? 'bounce' : 'complaint', detail, sourceDomain },
        update: { reason: isBounce ? 'bounce' : 'complaint', detail, sourceDomain, events: { increment: 1 }, lastAt: new Date() },
      })
    }
  }

  // Per-customer limits: pause the sending domain, never easonet as a whole.
  let paused = false
  if (sourceDomain) {
    const since = isBounce ? new Date(Date.now() - BOUNCE_LIMIT.hours * 3600_000) : new Date(Date.now() - COMPLAINT_LIMIT.days * 86400_000)
    const recent = await prisma.sesFeedbackEvent.count({ where: { sourceDomain, type, createdAt: { gte: since } } })
    const over = isBounce ? permanent && recent >= BOUNCE_LIMIT.count : recent >= COMPLAINT_LIMIT.count
    if (over) {
      const r = await prisma.mailDomain.updateMany({ where: { domain: sourceDomain, sendingPaused: false }, data: { sendingPaused: true } })
      paused = r.count > 0
    }
  }
  return `${type}${permanent ? ' (permanent)' : ''} for ${people.length} recipient(s)${suppress ? ', suppressed' : ''}${paused ? `, paused ${sourceDomain}` : ''}`
}

export async function isSuppressed(email: string): Promise<boolean> {
  return !!(await prisma.suppressedAddress.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } }))
}
