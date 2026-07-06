import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getAdminSession, type AdminSessionPayload } from '@/lib/admin/session'
import { isAdminHost, hostnameFromHeader } from '@/lib/admin/host'

// Authoritative auth check for admin server components — redirects if no valid session.
//
// This runs *after* src/proxy.ts has already rewritten admin.<domain>
// requests onto /admin/* (see handleAdminSubdomain), so a request reaching
// here can still be addressed either way. redirect() here produces a fresh
// Location header for the *current* response rather than a new browser
// navigation, so it must target whichever form the browser is actually
// showing — otherwise a clean "/dashboard" URL could redirect to
// "/admin/login" and leak the internal path onto the admin subdomain.
export async function requireAdmin(): Promise<AdminSessionPayload> {
  const session = await getAdminSession()
  if (!session) {
    const hostHeader = (await headers()).get('host')
    const onAdminHost = isAdminHost(hostnameFromHeader(hostHeader))
    redirect(onAdminHost ? '/login' : '/admin/login')
  }
  return session
}
