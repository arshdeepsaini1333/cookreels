import type { Metadata } from 'next'
import { Film } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Reels | CookReels Admin' }

export default function AdminReelsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reels" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reels' }]} />
      <EmptyState icon={Film} title="Reel management is coming soon" message="Browse, feature, and moderate published reels from here once this module is built." />
    </div>
  )
}
