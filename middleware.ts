import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''
  const url = req.nextUrl.clone()

  const ownDomains = ['easonet.com', 'www.easonet.com', 'app.easonet.com', 'localhost', 'vercel.app']
  const isOwnDomain = ownDomains.some(d => hostname.includes(d))
  if (isOwnDomain) return NextResponse.next()

  const domain = hostname.replace(/:\d+$/, '')
  url.pathname = `/p/_domain`
  url.searchParams.set('domain', domain)
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
