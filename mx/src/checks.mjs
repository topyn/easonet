import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { authenticate } = require('mailauth')

// Sender authentication (SPF/DKIM/DMARC/ARC) and optional spam scoring.

export async function checkAuth(message, { ip, helo, mailFrom, hostname, resolver }) {
  try {
    const result = await authenticate(message, {
      ip, helo, sender: mailFrom, mta: hostname,
      ...(resolver ? { resolver } : {}),
    })
    const dmarcResult = result.dmarc?.status?.result || 'none'
    return {
      spf: result.spf?.status?.result || 'none',
      dkim: (result.dkim?.results || []).map(r => r.status?.result).find(r => r === 'pass') || (result.dkim?.results?.[0]?.status?.result ?? 'none'),
      dmarc: dmarcResult,
      dmarcPolicy: result.dmarc?.policy || 'none',
      arc: result.arc?.status?.result || 'none',
    }
  } catch (err) {
    // DNS trouble must not cost real mail — record it and let spam scoring decide.
    return { spf: 'temperror', dkim: 'temperror', dmarc: 'temperror', dmarcPolicy: 'none', arc: 'none', error: err.message }
  }
}

/** Maps auth + spam results to what we do with the message. */
export function decide(auth, spam) {
  if (auth.dmarc === 'fail' && auth.dmarcPolicy === 'reject') {
    return { verdict: 'reject', code: 550, message: '5.7.1 Rejected by the sender domain\'s DMARC policy' }
  }
  if (spam?.action === 'reject') return { verdict: 'reject', code: 550, message: '5.7.1 Message rejected as spam' }
  if (spam?.action === 'soft reject' || spam?.action === 'greylist') {
    return { verdict: 'defer', code: 451, message: '4.7.1 Please try again later' }
  }
  const isSpam = (auth.dmarc === 'fail' && auth.dmarcPolicy === 'quarantine')
    || spam?.action === 'add header' || spam?.action === 'rewrite subject'
  return { verdict: isSpam ? 'spam' : 'accept' }
}

export async function checkSpam(message, { rspamdUrl, ip, helo, mailFrom, rcptTo, hostname, fetchImpl = fetch }) {
  if (!rspamdUrl) return null
  try {
    const res = await fetchImpl(`${rspamdUrl}/checkv2`, {
      method: 'POST',
      headers: { IP: ip, Helo: helo || '', From: mailFrom || '', Rcpt: rcptTo.join(','), MTA: hostname },
      body: message,
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`rspamd ${res.status}`)
    const data = await res.json()
    return { action: data.action, score: data.score }
  } catch (err) {
    // Fail open: a broken spam filter must not stop real mail.
    console.error(`[spam] rspamd unavailable: ${err.message}`)
    return null
  }
}
