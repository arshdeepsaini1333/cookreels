import type { Metadata } from 'next'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Settings | CookReels Admin' }

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Settings' }]} />
      <EmptyState icon={Settings} title="Admin settings are coming soon" message="Manage admin accounts, roles, and platform configuration from here once this module is built." />
    </div>
  )
}
