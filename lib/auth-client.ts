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

export async function refreshTokenIfNeeded(): Promise<boolean> {
  if (!isTokenExpired()) return true

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

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Try to refresh token if expired
  await refreshTokenIfNeeded()
  
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
