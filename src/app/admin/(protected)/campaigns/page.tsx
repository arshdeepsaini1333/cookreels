import type { Metadata } from 'next'
import Link from 'next/link'
import { Eye, MousePointer, Users2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/admin/tables/DataTable'
import { CampaignFilters } from '@/components/admin/campaigns/CampaignFilters'
import { CampaignStatusBadge } from '@/components/admin/campaigns/CampaignStatusBadge'
import { CampaignActionsMenu } from '@/components/admin/campaigns/CampaignActionsMenu'
import { getAdminCampaigns, type AdminCampaignListItem } from '@/lib/admin/campaigns'
import type { CampaignStatus } from '@/generated/prisma'

export const metadata: Metadata = { title: 'Campaigns | CookReels Admin' }

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-IN')

const VALID_STATUSES: CampaignStatus[] = ['DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'REJECTED']

interface PageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

export default async function AdminCampaignsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = params.status && VALID_STATUSES.includes(params.status as CampaignStatus)
    ? (params.status as CampaignStatus)
    : undefined
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const { items, total, limit } = await getAdminCampaigns({ status, search: params.search, page })
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const columns: DataTableColumn<AdminCampaignListItem>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: c => (
        <Link href={`/admin/campaigns/${c.id}`} className="block hover:text-[var(--cr-accent)]">
          <p className="font-semibold">{c.name}</p>
          <p className="text-xs text-[var(--cr-text-muted)]">
            @{c.advertiser.username} &middot; {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: c => <CampaignStatusBadge status={c.status} />,
    },
    {
      key: 'impressions',
      header: 'Impressions',
      className: 'text-right',
      render: c => (
        <span className="inline-flex items-center gap-1.5 justify-end">
          <Eye size={13} className="text-[var(--cr-text-muted)]" />
          {number.format(c.analytics?.impressions ?? 0)}
        </span>
      ),
    },
    {
      key: 'clicks',
      header: 'Clicks',
      className: 'text-right',
      render: c => (
        <span className="inline-flex items-center gap-1.5 justify-end">
          <MousePointer size={13} className="text-[var(--cr-text-muted)]" />
          {number.format(c.analytics?.clicks ?? 0)}
        </span>
      ),
    },
    {
      key: 'leads',
      header: 'Leads',
      className: 'text-right',
      render: c => (
        <span className="inline-flex items-center gap-1.5 justify-end">
          <Users2 size={13} className="text-[var(--cr-text-muted)]" />
          {number.format(c.leadCount)}
        </span>
      ),
    },
    {
      key: 'budget',
      header: 'Budget',
      className: 'text-right',
      render: c => currency.format(c.totalBudget),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-10',
      render: c => (
        <div className="flex justify-end">
          <CampaignActionsMenu id={c.id} status={c.status} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campaigns"
        breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Campaigns' }]}
      />

      <CampaignFilters />

      <DataTable
        columns={columns}
        rows={items}
        getRowKey={c => c.id}
        emptyMessage="No campaigns match these filters yet."
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--cr-text-2)]">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/admin/campaigns?${new URLSearchParams({ ...(status ? { status } : {}), ...(params.search ? { search: params.search } : {}), page: String(p) }).toString()}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg font-semibold transition-colors"
              style={p === page
                ? { background: 'var(--cr-accent)', color: 'var(--cr-btn-text)' }
                : { background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)' }}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
