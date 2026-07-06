import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/admin/auth'
import { AdminShell } from '@/components/admin/layout/AdminShell'

export const metadata: Metadata = {
  title: 'CookReels Admin',
  description: 'CookReels Admin Dashboard',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()

  return <AdminShell admin={admin}>{children}</AdminShell>
}
