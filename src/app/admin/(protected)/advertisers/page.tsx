import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Megaphone, DollarSign } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { KpiCard } from '@/components/admin/dashboard/KpiCard'
import { DataTable, type DataTableColumn } from '@/components/admin/tables/DataTable'
import { AdvertiserFilters } from '@/components/admin/advertisers/AdvertiserFilters'
import { getAdminAdvertisers, type AdminAdvertiserListItem } from '@/lib/admin/advertisers'

export const metadata: Metadata = { title: 'Advertisers | CookReels Admin' }

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-IN')

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function AdminAdvertisersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const { items, total, limit, summary } = await getAdminAdvertisers({ search: params.search, page })
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const columns: DataTableColumn<AdminAdvertiserListItem>[] = [
    {
      key: 'advertiser',
      header: 'Advertiser',
      render: a => (
        <div>
          <p className="font-semibold">{a.name || `@${a.username}`}</p>
          <p className="text-xs text-[var(--cr-text-muted)]">@{a.username}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: a => a.email,
    },
    {
      key: 'campaigns',
      header: 'Campaigns Run',
      className: 'text-right',
      render: a => (
        <div className="text-right">
          <p className="font-semibold">{number.format(a.campaignCount)}</p>
          {a.activeCampaignCount > 0 && (
            <p className="text-xs text-[var(--cr-text-muted)]">{number.format(a.activeCampaignCount)} live</p>
          )}
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Total Budget',
      className: 'text-right',
      render: a => currency.format(a.totalBudget),
    },
    {
      key: 'spend',
      header: 'Total Spend',
      className: 'text-right',
      render: a => currency.format(a.totalSpend),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Advertisers" breadcrumb={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Advertisers' }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Advertisers" value={number.format(summary.totalAdvertisers)} icon={Building2} />
        <KpiCard label="Campaigns Run" value={number.format(summary.totalCampaigns)} icon={Megaphone} />
        <KpiCard label="Total Spend" value={currency.format(summary.totalSpend)} icon={DollarSign} />
      </div>

      <AdvertiserFilters />

      <DataTable
        columns={columns}
        rows={items}
        getRowKey={a => a.id}
        emptyMessage="No advertisers match this search yet."
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--cr-text-2)]">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link
              key={p}
              href={`/admin/advertisers?${new URLSearchParams({ ...(params.search ? { search: params.search } : {}), page: String(p) }).toString()}`}
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
