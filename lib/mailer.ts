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

  const transporter = nodemailer.createTransport({
    host: identity.smtpHost,
    port: identity.smtpPort,
    secure: identity.smtpPort === 465,
    auth: {
      user: identity.smtpUser,
      pass: identity.smtpPass,
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

// Build Brevo SMTP config from env vars - used as the default sender
export function brevoSmtpConfig() {
  return {
    smtpHost: 'smtp-relay.brevo.com',
    smtpPort: 587,
    smtpUser: process.env.BREVO_SMTP_USER!,
    smtpPass: process.env.BREVO_SMTP_KEY!,
  }
}
