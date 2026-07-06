import type { Metadata } from 'next'
import { BarChart3 } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Analytics | CookReels Admin' }

export default function AdminAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Analytics' }]} />
      <EmptyState icon={BarChart3} title="Platform analytics is coming soon" message="Deep-dive engagement, growth, and revenue analytics will live here once this module is built." />
    </div>
  )
}
