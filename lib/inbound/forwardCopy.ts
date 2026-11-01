import nodemailer from 'nodemailer'
import type { Identity, MailDomain } from '@prisma/client'
import type { ParsedMail } from 'mailparser'
import { prisma } from '../prisma'
import { escapeHtml } from '../html'
import { BREVO_SMTP_HOST } from '../mailer'
import { type AuthResults, authWarning } from './auth'
import { splitAddress } from './routing'

// "Also send a copy to my personal email" for a seller mail domain. The original stays in the
// easonet inbox; the copy is a heads-up the seller can read in Gmail/Outlook/their phone. It's
// sent from our own address via Brevo (forwarding the original as-is would fail the sender's
// SPF/DMARC), with Reply-To set to the customer.

// Copies carry this header; inbound mail that has it is never copied again, so two domains
// copying to each other can't loop.
export const COPY_HEADER = 'x-easonet-copy'

// Attachments ride along up to this total; bigger ones stay in the inbox only.
const MAX_COPY_ATTACHMENT_BYTES = 8 * 1024 * 1024

const INBOX_URL = 'https://easonet.com/app'

export function canForwardCopy(mailDomain: MailDomain, parsed: ParsedMail): boolean {
  return !!mailDomain.forwardCopyTo && !!mailDomain.forwardCopyVerifiedAt && !parsed.headers.has(COPY_HEADER)
}

export async function sendForwardCopy(opts: {
  parsed: ParsedMail
  identity: Identity
  mailDomain: MailDomain
  auth: AuthResults | null
}): Promise<void> {
  const { parsed, identity, mailDomain, auth } = opts
  const to = mailDomain.forwardCopyTo!
  // Never copy into a domain we host ourselves — that's a loop waiting to happen.
  const target = splitAddress(to)
  if (!target || (await prisma.mailDomain.findUnique({ where: { domain: target.domain } }))) return

  const sender = parsed.from?.value?.[0]
  const senderLabel = sender?.name || sender?.address || 'Someone'
  const subject = parsed.subject ?? '(no subject)'

  const warning = authWarning(auth)
  const senderDomain = sender?.address?.split('@')[1] ?? 'the sender'
  const warningText = warning === 'forged'
    ? `⚠ This may not really be from ${senderDomain}: it failed the domain's own sender checks. Don't click links or send money or details.`
    : warning === 'unverified'
      ? `⚠ Unverified sender: we couldn't confirm this came from ${senderDomain}. Be careful with links and payment requests.`
      : null

  const attachments = parsed.attachments ?? []
  const attachmentBytes = attachments.reduce((n, a) => n + (a.size ?? a.content.length), 0)
  const includeAttachments = attachments.length > 0 && attachmentBytes <= MAX_COPY_ATTACHMENT_BYTES
  const attachmentNote = attachments.length && !includeAttachments
    ? `${attachments.length} attachment${attachments.length === 1 ? '' : 's'} too big to copy — open it in your inbox to see them.`
    : null

  const intro = `Copy of an email to ${identity.email}. Reply from your easonet inbox (${INBOX_URL}) so your answer comes from ${identity.email}.`
  const text = [intro, warningText, attachmentNote, '', '—', '', parsed.text ?? ''].filter(l => l !== null).join('\n')

  const banner = [
    `<p style="margin:0 0 6px;">Copy of an email to <b>${escapeHtml(identity.email)}</b>. Reply from your <a href="${INBOX_URL}">easonet inbox</a> so your answer comes from ${escapeHtml(identity.email)}.</p>`,
    warningText ? `<p style="margin:0 0 6px;color:${warning === 'forged' ? '#b91c1c' : '#b45309'};font-weight:600;">${escapeHtml(warningText)}</p>` : '',
    attachmentNote ? `<p style="margin:0 0 6px;">${escapeHtml(attachmentNote)}</p>` : '',
  ].join('')
  const html = `<div style="font-family:sans-serif;font-size:13px;color:#444;background:#f5f3ee;border-radius:6px;padding:10px 12px;margin-bottom:16px;">${banner}</div>`
    + (parsed.html || `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(parsed.text ?? '')}</pre>`)

  const transporter = nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: 587,
    auth: { user: process.env.BREVO_SMTP_USER!, pass: process.env.BREVO_SMTP_KEY! },
  })
  await transporter.sendMail({
    from: { name: `${senderLabel} via ${identity.email}`, address: process.env.MAIL_COPY_FROM || 'mark@easonet.com' },
    to,
    replyTo: sender?.address ? { name: sender.name || '', address: sender.address } : undefined,
    subject,
    text,
    html,
    headers: { [COPY_HEADER]: '1', 'Auto-Submitted': 'auto-forwarded' },
    attachments: includeAttachments
      ? attachments.map(a => ({ filename: a.filename || 'attachment', content: a.content, contentType: a.contentType }))
      : undefined,
  })
}
