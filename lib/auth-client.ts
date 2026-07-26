// Client-side auth utility - handles token storage and auto-refresh

export function getToken(): string {
  try { return localStorage.getItem('easonet_token') ?? '' } catch { return '' }
}

export function getRefreshToken(): string {
  try { return localStorage.getItem('easonet_refresh_token') ?? '' } catch { return '' }
}

export function setTokens(accessToken: string, refreshToken: string, user: object) {
  try {
    localStorage.setItem('easonet_token', accessToken)
    localStorage.setItem('easonet_refresh_token', refreshToken)
    localStorage.setItem('easonet_user', JSON.stringify(user))
    // Store expiry time (Supabase tokens last 1 hour)
    const expiry = Date.now() + 55 * 60 * 1000 // 55 minutes
    localStorage.setItem('easonet_token_expiry', String(expiry))
  } catch {}
}

export function clearTokens() {
  try {
    localStorage.removeItem('easonet_token')
    localStorage.removeItem('easonet_refresh_token')
    localStorage.removeItem('easonet_user')
    localStorage.removeItem('easonet_token_expiry')
  } catch {}
}

export function isTokenExpired(): boolean {
  try {
    const expiry = localStorage.getItem('easonet_token_expiry')
    if (!expiry) return true
    return Date.now() > parseInt(expiry)
  } catch { return true }
}

// Supabase refresh tokens are single-use and rotate on every refresh. Without this,
// two components mounting at once (e.g. loadIdentities + loadThreads on app load) each
// independently see an expired token and both fire a refresh with the same refresh
// token - the second one lands on an already-rotated token, fails, and (depending on
// Supabase's reuse-detection) can revoke the whole session. Sharing one in-flight
// refresh across every caller closes that race.
let refreshPromise: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setTokens(data.access_token, data.refresh_token, data.user)
    return true
  } catch { return false }
}

export async function refreshTokenIfNeeded(): Promise<boolean> {
  if (!isTokenExpired()) return true
  if (!refreshPromise) refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  return refreshPromise
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const refreshed = await refreshTokenIfNeeded()

  if (!refreshed) {
    // The session is dead and can't be silently repaired - clear it and bounce to login
    // instead of sending a request we already know will be rejected, which is what let
    // this fail silently as "no data" everywhere instead of as a visible logged-out state.
    clearTokens()
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    return new Response(JSON.stringify({ error: 'Session expired' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = getToken()
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
}
