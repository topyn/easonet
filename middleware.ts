import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || ''

  // Skip easonet's own domains
  const ownDomains = ['easonet.com', 'www.easonet.com', 'app.easonet.com', 'localhost', 'vercel.app']
  const isOwnDomain = ownDomains.some(d => hostname.includes(d))
  if (isOwnDomain) return NextResponse.next()

  // Custom domain — rewrite path and pass domain via header
  const domain = hostname.replace(/^www\./, '').replace(/:\d+$/, '')
  const url = req.nextUrl.clone()
  url.pathname = `/p/_domain`
  url.searchParams.set('domain', domain)
  
  const response = NextResponse.rewrite(url)
  response.headers.set('x-brand-domain', domain)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
