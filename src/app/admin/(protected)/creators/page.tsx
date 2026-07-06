import type { Metadata } from 'next'
import { ChefHat } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Creators | CookReels Admin' }

export default function AdminCreatorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Creators" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Creators' }]} />
      <EmptyState icon={ChefHat} title="Creator management is coming soon" message="Track top creators, verification status, and creator performance from here once this module is built." />
    </div>
  )
}
