import type { ParsedMail } from 'mailparser'

// Sender checks (SPF / DKIM / DMARC) for an inbound message, saved on Message.authResults so
// the inbox can flag mail that may not really be from who it says.
//   - Our MX servers run the checks themselves and post them to /api/mail/ingest.
//   - Cloudflare Email Routing (Mark's own domains) adds an Authentication-Results header; we
//     trust only the topmost one and only when Cloudflare wrote it — anything lower down could
//     have been written by the sender.

export type AuthResults = {
  spf?: string
  dkim?: string
  dmarc?: string
  source: 'mx' | 'cloudflare'
}

const TRUSTED_AUTHSERV = /^(mx\.cloudflare\.net|[\w-]+\.mx\.cloudflare\.net)$/i

function pick(header: string, method: string): string | undefined {
  return header.match(new RegExp(`(?:^|[;\\s])${method}=([a-z]+)`, 'i'))?.[1]?.toLowerCase()
}

export function authFromCloudflareHeaders(parsed: ParsedMail): AuthResults | null {
  // headerLines keeps the raw order; the first Authentication-Results is the one added last.
  for (const name of ['authentication-results', 'arc-authentication-results']) {
    const line = parsed.headerLines?.find(h => h.key === name)
    if (!line) continue
    let value = line.line.slice(line.line.indexOf(':') + 1).replace(/\r?\n[ \t]+/g, ' ').trim()
    if (name === 'arc-authentication-results') value = value.replace(/^i=\d+\s*;\s*/i, '')
    const authserv = value.split(';')[0].trim().split(/\s+/)[0]
    if (!TRUSTED_AUTHSERV.test(authserv)) continue
    return { spf: pick(value, 'spf'), dkim: pick(value, 'dkim'), dmarc: pick(value, 'dmarc'), source: 'cloudflare' }
  }
  return null
}

/** 'forged' = DMARC failed; 'unverified' = nothing passed; null = fine or unknown. */
export function authWarning(a: Pick<AuthResults, 'spf' | 'dkim' | 'dmarc'> | null | undefined): 'forged' | 'unverified' | null {
  if (!a) return null
  if (a.dmarc === 'fail') return 'forged'
  if (a.dmarc === 'pass' || a.spf === 'pass' || a.dkim === 'pass') return null
  if (!a.spf && !a.dkim && !a.dmarc) return null
  return 'unverified'
}
