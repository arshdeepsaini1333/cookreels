import type { Metadata } from 'next'
import { Users } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Users | CookReels Admin' }

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Users" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Users' }]} />
      <EmptyState icon={Users} title="User management is coming soon" message="Search, inspect, and moderate CookReels user accounts from here once this module is built." />
    </div>
  )
}
