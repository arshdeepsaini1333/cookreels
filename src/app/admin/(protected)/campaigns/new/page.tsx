import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { CampaignForm } from '@/components/admin/campaigns/CampaignForm'

export const metadata: Metadata = { title: 'New Campaign | CookReels Admin' }

export default function AdminNewCampaignPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New Campaign"
        breadcrumb={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Campaigns', href: '/admin/campaigns' },
          { label: 'New' },
        ]}
      />
      <div className="max-w-3xl rounded-2xl border p-6 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
        <CampaignForm mode="create" />
      </div>
    </div>
  )
}
