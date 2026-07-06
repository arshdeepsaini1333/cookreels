import type { Metadata } from 'next'
import { Flag } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Reports | CookReels Admin' }

export default function AdminReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports' }]} />
      <EmptyState icon={Flag} title="User reports are coming soon" message="Review reports filed by users against content and other users from here once this module is built." />
    </div>
  )
}
