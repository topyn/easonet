// In-memory copy of which domains/addresses we accept mail for, refreshed from easonet.
// RCPT checks read only this, so a slow or briefly-down easonet never delays the SMTP
// conversation. A failed refresh keeps the last good copy. Mirrors easonet
// lib/inbound/routing.ts (which re-checks against the database at ingest).

export const SYSTEM_LOCAL_PARTS = ['postmaster', 'abuse']

export function splitAddress(address) {
  const a = String(address || '').trim().toLowerCase()
  const at = a.lastIndexOf('@')
  if (at < 1 || at === a.length - 1) return null
  return { local: a.slice(0, at), domain: a.slice(at + 1).replace(/\.$/, '') }
}

/** @returns 'accept' | 'unknown-user' | 'not-our-domain' | 'invalid' */
export function resolveAgainst(domains, address) {
  const parts = splitAddress(address)
  if (!parts) return 'invalid'
  const d = domains[parts.domain]
  if (!d) return 'not-our-domain'
  const base = parts.local.split('+')[0]
  if (d.addresses.includes(parts.local) || d.addresses.includes(base)) return 'accept'
  // postmaster@/abuse@ and catch-all go to the domain's first address, so need one to exist.
  if (d.addresses.length && (SYSTEM_LOCAL_PARTS.includes(base) || d.catchAll)) return 'accept'
  return 'unknown-user'
}

export function createAddressBook({ client, refreshMs, logger = console }) {
  let domains = null
  let loadedAt = 0
  let timer = null

  async function refresh() {
    try {
      const data = await client.getAddressList()
      if (!data || typeof data.domains !== 'object') throw new Error('bad address list payload')
      domains = data.domains
      loadedAt = Date.now()
    } catch (err) {
      logger.error(`[addresses] refresh failed, keeping last good copy: ${err.message}`)
    }
  }

  return {
    refresh,
    async start() {
      await refresh()
      timer = setInterval(refresh, refreshMs)
      timer.unref?.()
    },
    stop() { if (timer) clearInterval(timer) },
    isReady: () => domains !== null,
    ageMs: () => (loadedAt ? Date.now() - loadedAt : Infinity),
    resolve: address => (domains ? resolveAgainst(domains, address) : 'not-ready'),
  }
}
