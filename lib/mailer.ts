import nodemailer from 'nodemailer'
import { Identity } from '@prisma/client'

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
  const { identity, to, cc, bcc, subject, text, html, attachments, inReplyTo, references } = opts

  // Identities on the shared Brevo relay use easonet's key from env - it's never stored per row.
  const onBrevo = identity.smtpHost === BREVO_SMTP_HOST
  const transporter = nodemailer.createTransport({
    host: identity.smtpHost,
    port: identity.smtpPort,
    secure: identity.smtpPort === 465,
    auth: {
      user: onBrevo ? process.env.BREVO_SMTP_USER! : identity.smtpUser,
      pass: onBrevo ? process.env.BREVO_SMTP_KEY! : identity.smtpPass,
    },
  })

  const info = await transporter.sendMail({
    from: `"${identity.name}" <${identity.email}>`,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    subject,
    text,
    html: html || undefined,
    attachments: attachments?.length ? attachments : undefined,
    // Threading headers - recipient mail client uses these to group replies
    ...(inReplyTo && { inReplyTo }),
    ...(references && { references }),
  })

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
