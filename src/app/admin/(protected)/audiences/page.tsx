import type { Metadata } from 'next'
import { Target } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Audiences | CookReels Admin' }

export default function AdminAudiencesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audiences" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Audiences' }]} />
      <EmptyState icon={Target} title="Audience management is coming soon" message="Inspect saved audiences and targeting segments across all advertisers from here once this module is built." />
    </div>
  )
}
