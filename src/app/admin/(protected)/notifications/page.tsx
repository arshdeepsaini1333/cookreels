import type { Metadata } from 'next'
import { Bell } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Notifications | CookReels Admin' }

export default function AdminNotificationsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Notifications' }]} />
      <EmptyState icon={Bell} title="Admin notifications are coming soon" message="System alerts and platform-wide broadcast notifications will be managed from here once this module is built." />
    </div>
  )
}
