import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeAdminSession, ADMIN_COOKIE_NAME } from '@/lib/admin/session'

const ADMIN_LOGIN_ROUTE = '/admin/login'

// Optimistic cookie check for /admin/* routes, delegated to from src/proxy.ts
// (Next.js only supports a single proxy.ts per project). Returns a redirect
// response when the route should not proceed as-is, or null to fall through.
export function handleAdminProxy(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const session = token ? decodeAdminSession(token) : null

  const isLoginRoute = pathname === ADMIN_LOGIN_ROUTE

  if (!isLoginRoute && !session) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_ROUTE, request.url))
  }

  if (isLoginRoute && session) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return NextResponse.next()
}
