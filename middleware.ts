import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_COUNTRY = 'AU'
const BYPASS_COOKIE = 'easonet_geo_bypass'
const BYPASS_QUERY = 'bypass'

// Only the dashboard + its auth surface - never the public brand pages, checkout,
// webhooks, or the public dns-lookup tool. Signup/login are included, not just the
// page shells, since a credential-stuffing bot never bothers loading /login's HTML -
// it POSTs straight to the API.
function isGeofencedPath(pathname: string): boolean {
  return pathname === '/app' || pathname.startsWith('/app/')
    || pathname === '/login'
    || pathname.startsWith('/api/auth/')
}

// Edge Middleware runs on a restricted runtime without node:crypto, so this is a
// hand-rolled constant-time compare rather than crypto.timingSafeEqual.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const pathname = req.nextUrl.pathname

  // Skip easonet's own domains
  const ownDomains = ['easonet.com', 'www.easonet.com', 'app.easonet.com', 'localhost', 'vercel.app']
  const isOwnDomain = ownDomains.some(d => hostname.includes(d))
  if (isOwnDomain) {
    if (isGeofencedPath(pathname)) {
      // Vercel populates this on every request at the edge; absent locally/off-Vercel,
      // where we fail open rather than risk locking everyone out.
      const country = req.headers.get('x-vercel-ip-country')
      const isBlocked = !!country && country !== ALLOWED_COUNTRY

      if (isBlocked) {
        const secret = process.env.GEOFENCE_BYPASS_SECRET
        const queryVal = req.nextUrl.searchParams.get(BYPASS_QUERY)
        const cookieVal = req.cookies.get(BYPASS_COOKIE)?.value

        // A valid bypass query param wins first - consume it, set a cookie, and redirect
        // to a clean URL so the secret doesn't linger in the address bar/history any
        // longer than the one request that used it.
        if (secret && queryVal && safeEqual(queryVal, secret)) {
          const cleanUrl = req.nextUrl.clone()
          cleanUrl.searchParams.delete(BYPASS_QUERY)
          const res = NextResponse.redirect(cleanUrl)
          res.cookies.set(BYPASS_COOKIE, secret, {
            httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
          })
          return res
        }

        const bypassedByCookie = !!secret && !!cookieVal && safeEqual(cookieVal, secret)
        if (!bypassedByCookie) {
          return new NextResponse('This area of easonet is only available from Australia.', { status: 403 })
        }
      }
    }
    return NextResponse.next()
  }

  // On custom domains, allow /p/, /api/, /_next/ through directly
  if (pathname.startsWith('/p/') || pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // For root and other paths, rewrite to brand domain handler
  const domain = hostname.replace(/^www\./, '').replace(/:\d+$/, '')
  const url = req.nextUrl.clone()
  url.pathname = `/p/_domain`
  url.searchParams.set('domain', domain)
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
