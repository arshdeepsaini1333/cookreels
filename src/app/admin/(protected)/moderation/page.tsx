import type { Metadata } from 'next'
import { ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Moderation | CookReels Admin' }

export default function AdminModerationPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Moderation" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Moderation' }]} />
      <EmptyState icon={ShieldAlert} title="Moderation queue is coming soon" message="Review flagged recipes, reels, and comments awaiting moderation action from here once this module is built." />
    </div>
  )
}
