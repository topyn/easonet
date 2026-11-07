import nodemailer from 'nodemailer'
import { Identity } from '@prisma/client'
import { prisma } from './prisma'

// Outgoing mail goes one of two ways:
//   - Amazon SES (Sydney) for identities on a domain verified in SES (SES_SENDING_DOMAINS,
//     default easonet.com — production access granted 7 Nov 2026), once SES_SMTP_USER /
//     SES_SMTP_PASS are set. Sends carry the "easonet-default" configuration set, so bounces and
//     complaints come back through SNS (lib/sesFeedback.ts).
//   - Brevo, as before, for every other identity (customer domains not yet verified in SES), or
//     for everything while the SES credentials aren't set.
// Either way, addresses that have bounced or complained (SuppressedAddress) are never mailed,
// and a sending domain paused for complaints/bounces (MailDomain.sendingPaused) can't send.
// SES's classic SMTP endpoint, or — for this account, where the SES console creates SMTP logins
// as a Mail Manager authenticated ingress endpoint (user "inp-…", relays out via a
// send-to-internet rule) — that endpoint's own host, set in SES_SMTP_HOST.
export const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.ap-southeast-2.amazonaws.com'
const SES_CONFIGURATION_SET = 'easonet-default'
const sesDomains = () => (process.env.SES_SENDING_DOMAINS || 'easonet.com').split(',').map(d => d.trim().toLowerCase()).filter(Boolean)

export function sendsViaSes(identity: Pick<Identity, 'email'>): boolean {
  const domain = identity.email.split('@')[1]?.toLowerCase() || ''
  return !!process.env.SES_SMTP_USER && !!process.env.SES_SMTP_PASS && sesDomains().includes(domain)
}

export class SendBlockedError extends Error {}

// Drops suppressed addresses from a comma-separated list; returns what's left and what was dropped.
async function withoutSuppressed(list: string | undefined): Promise<{ kept: string | undefined; dropped: string[] }> {
  const parts = String(list || '').split(',').map(x => x.trim()).filter(Boolean)
  if (!parts.length) return { kept: undefined, dropped: [] }
  const bare = (a: string) => (/<([^>]+)>/.exec(a)?.[1] || a).trim().toLowerCase()
  const hits = await prisma.suppressedAddress.findMany({ where: { email: { in: parts.map(bare) } }, select: { email: true } })
  const blocked = new Set(hits.map(h => h.email))
  const kept = parts.filter(a => !blocked.has(bare(a)))
  return { kept: kept.length ? kept.join(', ') : undefined, dropped: parts.filter(a => blocked.has(bare(a))) }
}

export interface MailAttachment {
  filename: string
  path: string        // signed URL nodemailer fetches the content from
  contentType?: string
}

export interface SendOptions {
  identity: Identity
  to: string
  cc?: string
  bcc?: string
  subject: string
  text: string
  html?: string
  attachments?: MailAttachment[]
  inReplyTo?: string   // Message-ID of email being replied to
  references?: string  // Full References chain for threading
}

export async function sendFromIdentity(opts: SendOptions) {
  const { identity, subject, text, html, attachments, inReplyTo, references } = opts

  const fromDomain = identity.email.split('@')[1]?.toLowerCase() || ''
  const paused = await prisma.mailDomain.findFirst({ where: { domain: fromDomain, sendingPaused: true }, select: { id: true } })
  if (paused) throw new SendBlockedError(`Sending from ${fromDomain} is paused after bounces or complaints. Contact easonet support.`)

  const [to, cc, bcc] = await Promise.all([withoutSuppressed(opts.to), withoutSuppressed(opts.cc), withoutSuppressed(opts.bcc)])
  const dropped = [...to.dropped, ...cc.dropped, ...bcc.dropped]
  if (dropped.length) console.warn('mailer: skipped suppressed recipients', dropped)
  if (!to.kept && !cc.kept && !bcc.kept) throw new SendBlockedError('Not sent: every recipient has bounced or complained before.')

  // Identities on the shared Brevo relay use easonet's key from env - it's never stored per row.
  const onBrevo = identity.smtpHost === BREVO_SMTP_HOST
  const identityTransport = () => nodemailer.createTransport({
    host: identity.smtpHost,
    port: identity.smtpPort,
    secure: identity.smtpPort === 465,
    auth: {
      user: onBrevo ? process.env.BREVO_SMTP_USER! : identity.smtpUser,
      pass: onBrevo ? process.env.BREVO_SMTP_KEY! : identity.smtpPass,
    },
  })
  const message = {
    from: `"${identity.name}" <${identity.email}>`,
    to: to.kept,
    cc: cc.kept,
    bcc: bcc.kept,
    subject,
    text,
    html: html || undefined,
    attachments: attachments?.length ? attachments : undefined,
    // Threading headers - recipient mail client uses these to group replies
    ...(inReplyTo && { inReplyTo }),
    ...(references && { references }),
  }

  if (sendsViaSes(identity)) {
    try {
      const ses = nodemailer.createTransport({ host: SES_SMTP_HOST, port: 587, secure: false, auth: { user: process.env.SES_SMTP_USER!, pass: process.env.SES_SMTP_PASS! } })
      const info = await ses.sendMail({ ...message, headers: { 'X-SES-CONFIGURATION-SET': SES_CONFIGURATION_SET } })
      return info.messageId
    } catch (e: any) {
      // SES couldn't be reached or refused our login (not the recipient): don't lose the email,
      // send it the old way and shout in the logs. Anything else (a rejected message) is thrown.
      const ours = e?.code === 'EAUTH' || e?.code === 'ECONNECTION' || e?.code === 'ETIMEDOUT' || e?.code === 'ESOCKET'
      if (!ours) throw e
      console.error('mailer: SES failed, falling back to the identity relay', e?.code, e?.response || e?.message)
    }
  }

  const info = await identityTransport().sendMail(message)
  return info.messageId
}

export const BREVO_SMTP_HOST = 'smtp-relay.brevo.com'

// Brevo SMTP config for a new identity - the default sender. Credentials are left blank on
// purpose: sendFromIdentity reads them from env, so the master key never sits in the DB.
export function brevoSmtpConfig() {
  return {
    smtpHost: BREVO_SMTP_HOST,
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
  }
}
