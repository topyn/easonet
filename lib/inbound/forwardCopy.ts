import nodemailer from 'nodemailer'
import type { Identity, MailDomain } from '@prisma/client'
import type { ParsedMail } from 'mailparser'
import { prisma } from '../prisma'
import { escapeHtml } from '../html'
import { BREVO_SMTP_HOST, sesReadyForDomain, sesTransport, SES_CONFIG_HEADERS } from '../mailer'
import { type AuthResults, authWarning } from './auth'
import { splitAddress } from './routing'

// "Also send a copy to my personal email" for a seller mail domain. The original stays in the
// easonet inbox; the copy is a heads-up the seller can read in Gmail/Outlook/their phone, and
// often replies to straight from there (Gmail "Send mail as" the shop address). Forwarding the
// original as-is would fail the sender's SPF/DMARC, so it's re-sent with Reply-To the customer.
//
// Because the seller replies from the copy, the customer ends up seeing it quoted. So (Nov 2026,
// Inked Creations): no "this is a copy" note on top, and it goes via SES from
// copies@<shop domain> ("Jane Customer <copies@inkedcreations.com.au> wrote:") rather than via
// Brevo from mark@easonet.com, which also rewrote every link into a click-tracking URL. Brevo is
// only the fallback for a domain not verified in SES or when SES can't be reached. Not hello@:
// Gmail treats mail from a seller's own send-as address as sent by them and replies go astray.
//
// The copy is delivered to the personal address (SMTP envelope) but its To header is the shop
// address, e.g. hello@inkedcreations.com.au. A seller who has added that address to Gmail's
// "Send mail as" then gets it picked automatically on reply (Gmail's default "reply from the
// same address the message was sent to"), while their personal mail keeps replying as Gmail.

// Copies carry this header; inbound mail that has it is never copied again, so two domains
// copying to each other can't loop.
export const COPY_HEADER = 'x-easonet-copy'

// Attachments ride along up to this total; bigger ones stay in the inbox only.
const MAX_COPY_ATTACHMENT_BYTES = 8 * 1024 * 1024


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

  // Only a scam warning or a too-big-attachments note goes on top, and only when there is one.
  const notes = [warningText, attachmentNote].filter((l): l is string => !!l)
  const text = [...notes, ...(notes.length ? [''] : []), parsed.text ?? ''].join('\n')
  const box = notes.length
    ? `<div style="font-family:sans-serif;font-size:13px;color:#444;background:#f5f3ee;border-radius:6px;padding:10px 12px;margin-bottom:16px;">${[
        warningText ? `<p style="margin:0 0 6px;color:${warning === 'forged' ? '#b91c1c' : '#b45309'};font-weight:600;">${escapeHtml(warningText)}</p>` : '',
        attachmentNote ? `<p style="margin:0;">${escapeHtml(attachmentNote)}</p>` : '',
      ].join('')}</div>`
    : ''
  const html = box + (parsed.html || `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(parsed.text ?? '')}</pre>`)

  const message = {
    to: identity.email,
    replyTo: sender?.address ? { name: sender.name || '', address: sender.address } : undefined,
    subject,
    text,
    html,
    attachments: includeAttachments
      ? attachments.map(a => ({ filename: a.filename || 'attachment', content: a.content, contentType: a.contentType }))
      : undefined,
  }
  const headers = { [COPY_HEADER]: '1', 'Auto-Submitted': 'auto-forwarded' }

  if (sesReadyForDomain(mailDomain.domain)) {
    const copyFrom = `copies@${mailDomain.domain.toLowerCase()}`
    try {
      await sesTransport().sendMail({ ...message, from: { name: senderLabel, address: copyFrom }, envelope: { from: copyFrom, to }, headers: { ...headers, ...SES_CONFIG_HEADERS } })
      return
    } catch (e: any) {
      const ours = e?.code === 'EAUTH' || e?.code === 'ECONNECTION' || e?.code === 'ETIMEDOUT' || e?.code === 'ESOCKET'
      if (!ours) throw e
      console.error('forwardCopy: SES failed, sending the copy via Brevo', e?.code, e?.response || e?.message)
    }
  }

  const copyFrom = process.env.MAIL_COPY_FROM || 'mark@easonet.com'
  const brevo = nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: 587,
    auth: { user: process.env.BREVO_SMTP_USER!, pass: process.env.BREVO_SMTP_KEY! },
  })
  await brevo.sendMail({ ...message, from: { name: senderLabel, address: copyFrom }, envelope: { from: copyFrom, to }, headers })
}
