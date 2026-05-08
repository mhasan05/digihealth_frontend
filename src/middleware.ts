import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = request.cookies.has('dh_auth')
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Already logged in → send away from login/register back to root (root page handles portal routing)
  if (isPublic && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Not logged in → send to login, preserve intended destination
  if (!isPublic && !isAuthenticated) {
    const url = new URL('/login', request.url)
    if (pathname !== '/') url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Skip Next.js internals, static files, and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
