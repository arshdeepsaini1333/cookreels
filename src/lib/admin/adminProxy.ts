import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeAdminSession, ADMIN_COOKIE_NAME } from '@/lib/admin/session'

const ADMIN_LOGIN_ROUTE = '/admin/login'

// Optimistic cookie check for /admin/* routes accessed by their real,
// /admin-prefixed path — used only in local dev, before the admin subdomain
// exists (see isLocalDevHost in host.ts). Delegated to from src/proxy.ts
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

// Auth + routing for the admin.<domain> clean-URL host. The real pages still
// live under /admin/* on disk, but the browser must never see that prefix —
// so every response here is either:
//   - a redirect against a *clean* path (/login, /dashboard, ...), or
//   - an invisible rewrite onto the matching /admin/* file, which keeps the
//     clean path in the address bar.
// Delegated to from src/proxy.ts once it detects an admin.* Host header.
export function handleAdminSubdomain(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // Tolerate a stray "/admin" prefix (old bookmark, a hardcoded href copied
  // from the path-mode era) by treating it the same as the clean path below,
  // then normalizing the browser URL back to clean once we know where to go.
  const hadAdminPrefix = pathname === '/admin' || pathname.startsWith('/admin/')
  const cleanPath = hadAdminPrefix ? (pathname.slice('/admin'.length) || '/') : pathname

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const session = token ? decodeAdminSession(token) : null

  // The admin host's root has no page of its own — it only ever forwards to
  // /dashboard or /login, so /admin is never rendered (and never leaks into
  // the URL) for this case.
  if (cleanPath === '/') {
    return NextResponse.redirect(new URL(session ? '/dashboard' : '/login', request.url))
  }

  const isLoginPath = cleanPath === '/login'

  if (!isLoginPath && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isLoginPath && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (hadAdminPrefix) {
    return NextResponse.redirect(new URL(cleanPath, request.url))
  }

  // Authenticated (or headed to /login while signed out) on a clean path —
  // invisibly serve the real page that lives under /admin/*.
  const target = request.nextUrl.clone()
  target.pathname = `/admin${cleanPath}`
  return NextResponse.rewrite(target)
}
