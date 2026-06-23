import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeSession, COOKIE_NAME } from '@/lib/session'

const protectedRoutes = ['/']
const authRoutes = ['/auth/login', '/auth/signup']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value
  const session = token ? decodeSession(token) : null

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.mp4$).*)'],
}