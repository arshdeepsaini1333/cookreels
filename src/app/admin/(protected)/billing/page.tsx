import type { Metadata } from 'next'
import { CreditCard } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export const metadata: Metadata = { title: 'Billing | CookReels Admin' }

export default function AdminBillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Billing" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Billing' }]} />
      <EmptyState icon={CreditCard} title="Billing management is coming soon" message="Track payments, invoices, and payouts platform-wide from here once this module is built." />
    </div>
  )
}
