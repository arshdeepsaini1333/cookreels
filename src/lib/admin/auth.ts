import { redirect } from 'next/navigation'
import { getAdminSession, type AdminSessionPayload } from '@/lib/admin/session'

// Authoritative auth check for admin server components — redirects if no valid session.
export async function requireAdmin(): Promise<AdminSessionPayload> {
  const session = await getAdminSession()
  if (!session) {
    redirect('/admin/login')
  }
  return session
}
