import { createHmac } from 'node:crypto'

// Signed calls to easonet. Signature = HMAC-SHA256 over "<unix seconds>.<METHOD>.<path>.<body>"
// with MAIL_HMAC_SECRET — keep in step with easonet lib/inbound/signature.ts.

export function signRequest(secret, ts, method, path, body) {
  return createHmac('sha256', secret).update(`${ts}.${method.toUpperCase()}.${path}.${body}`).digest('hex')
}

export class EasonetError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export function createEasonetClient({ easonetUrl, secret, fetchImpl = fetch, timeoutMs = 20_000 }) {
  async function call(method, path, payload) {
    const body = payload === undefined ? '' : JSON.stringify(payload)
    const ts = Math.floor(Date.now() / 1000)
    const res = await fetchImpl(`${easonetUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-easonet-timestamp': String(ts),
        'x-easonet-signature': signRequest(secret, ts, method, path, body),
      },
      body: method === 'GET' ? undefined : body,
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await res.text()
    if (!res.ok) throw new EasonetError(`${method} ${path} → ${res.status} ${text.slice(0, 200)}`, res.status)
    return text ? JSON.parse(text) : {}
  }

  return {
    getAddressList: () => call('GET', '/api/mail/address-list'),
    getUploadUrl: (sha256, size) => call('POST', '/api/mail/upload-url', { sha256, size }),
    ingest: payload => call('POST', '/api/mail/ingest', payload),

    // Straight to Supabase Storage with the one-time signed URL — no Supabase key on this box.
    async uploadRaw(signedUrl, buffer) {
      const res = await fetchImpl(signedUrl, {
        method: 'PUT',
        headers: { 'content-type': 'message/rfc822', 'x-upsert': 'false' },
        body: buffer,
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) throw new EasonetError(`upload → ${res.status} ${(await res.text()).slice(0, 200)}`, res.status)
    },
  }
}
