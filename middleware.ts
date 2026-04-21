import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const pathname = req.nextUrl.pathname

  // Skip easonet's own domains
  const ownDomains = ['easonet.com', 'www.easonet.com', 'app.easonet.com', 'localhost', 'vercel.app']
  const isOwnDomain = ownDomains.some(d => hostname.includes(d))
  if (isOwnDomain) return NextResponse.next()

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
