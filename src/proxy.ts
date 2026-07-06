import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decodeSession, COOKIE_NAME } from '@/lib/session'
import { handleAdminProxy, handleAdminSubdomain } from '@/lib/admin/adminProxy'
import { isAdminHost, isLocalDevHost, hostnameFromHeader } from '@/lib/admin/host'

const protectedRoutes = ['/']
const authRoutes = ['/auth/login', '/auth/signup']

// Returned directly (no rewrite/redirect hop) whenever /admin/* is requested
// on a hostname that must not expose it — a plain 404 response, not routed
// through any page, so it can't collide with an unrelated catch-all/dynamic
// route (e.g. a top-level "/[username]" page) and can't be mistaken for a
// redirect by anything inspecting the raw response.
function hiddenAdminResponse(): NextResponse {
  return new NextResponse('Not Found', {
    status: 404,
    headers: { 'content-type': 'text/plain' },
  })
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = hostnameFromHeader(request.headers.get('host'))

  // ── admin.<domain> — the whole host is the admin panel, served through
  // clean URLs (no /admin prefix ever reaches the browser). ──────────────────
  if (isAdminHost(hostname)) {
    return handleAdminSubdomain(request)
  }

  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')

  if (isAdminPath) {
    // Local dev workflow, before the admin subdomain is wired up: keep
    // supporting /admin/* directly at localhost, exactly as before.
    if (isLocalDevHost(hostname)) {
      return handleAdminProxy(request)
    }

    // Any other (public/production) hostname: the /admin/* path space must
    // not exist here at all — a direct 404, never a redirect, never a hint
    // that /admin exists on this host.
    return hiddenAdminResponse()
  }

  // ── Public site — unchanged user-session handling. ─────────────────────────
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