import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Eye, MousePointer, Heart, UserPlus, DollarSign, Target } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'
import { CampaignStatusBadge } from '@/components/admin/campaigns/CampaignStatusBadge'
import { CampaignStatusActions } from '@/components/admin/campaigns/CampaignStatusActions'
import { CampaignForm, type CampaignFormValues } from '@/components/admin/campaigns/CampaignForm'
import { AddLeadModal } from '@/components/admin/campaigns/AddLeadModal'
import { AddStatsModal } from '@/components/admin/campaigns/AddStatsModal'
import { getAdminCampaignById } from '@/lib/admin/campaigns'
import type { LeadStatus } from '@/generated/prisma'

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-IN')

const LEAD_STATUS_CFG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  NEW:       { label: 'New',       color: '#4285F4', bg: 'rgba(66,133,244,0.15)' },
  CONTACTED: { label: 'Contacted', color: '#F5C518', bg: 'rgba(245,197,24,0.15)' },
  CONVERTED: { label: 'Converted', color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  DROPPED:   { label: 'Dropped',   color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
}

function toDateInput(d: Date | null): string {
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export const metadata: Metadata = { title: 'Campaign Details | CookReels Admin' }

export default async function AdminCampaignDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { edit } = await searchParams

  const campaign = await getAdminCampaignById(id)
  if (!campaign) notFound()

  const breadcrumb = [
    { label: 'Admin', href: '/admin/dashboard' },
    { label: 'Campaigns', href: '/admin/campaigns' },
    { label: campaign.name },
  ]

  if (edit) {
    const initialValues: Partial<CampaignFormValues> = {
      name: campaign.name,
      objective: campaign.objective,
      dailyBudget: String(campaign.dailyBudget),
      totalBudget: String(campaign.totalBudget),
      durationDays: String(campaign.durationDays),
      impressions: String(campaign.impressions),
      startDate: toDateInput(campaign.startDate),
      endDate: toDateInput(campaign.endDate),
      ageMin: campaign.ageMin ? String(campaign.ageMin) : '',
      ageMax: campaign.ageMax ? String(campaign.ageMax) : '',
      gender: campaign.gender ?? '',
      locations: Array.isArray(campaign.locations) ? (campaign.locations as string[]).join(', ') : '',
      bannerUrl: campaign.bannerUrl ?? '',
      adVideoUrl: campaign.adVideoUrl ?? '',
    }

    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={`Edit "${campaign.name}"`} breadcrumb={breadcrumb} />
        <div className="max-w-3xl rounded-2xl border p-6 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
          <CampaignForm mode="edit" campaignId={campaign.id} initialValues={initialValues} />
        </div>
      </div>
    )
  }

  const kpis = [
    { label: 'Impressions', value: number.format(campaign.analytics?.impressions ?? 0), icon: Eye },
    { label: 'Clicks', value: number.format(campaign.analytics?.clicks ?? 0), icon: MousePointer },
    { label: 'Likes', value: number.format(campaign.analytics?.likes ?? 0), icon: Heart },
    { label: 'Followers Gained', value: number.format(campaign.analytics?.followersGained ?? 0), icon: UserPlus },
    { label: 'Spend', value: currency.format(campaign.analytics?.spend ?? 0), icon: DollarSign },
    { label: 'Leads', value: number.format(campaign.leads.length), icon: Target },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={campaign.name} breadcrumb={breadcrumb} action={<CampaignStatusBadge status={campaign.status} />} />

      <div className="rounded-2xl border p-5 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
        <CampaignStatusActions id={campaign.id} status={campaign.status} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--cr-text-1)]">Performance</h3>
        <AddStatsModal campaignId={campaign.id} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl border p-4 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
            <k.icon size={16} className="mb-2 text-[var(--cr-accent)]" />
            <p className="text-lg font-heading font-bold text-[var(--cr-text-1)]">{k.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border p-5 shadow-premium lg:col-span-2" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
          <h3 className="mb-4 text-sm font-semibold text-[var(--cr-text-1)]">Campaign Details</h3>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-[var(--cr-text-muted)]">Objective</dt><dd className="font-medium text-[var(--cr-text-1)]">{campaign.objective.replaceAll('_', ' ')}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Duration</dt><dd className="font-medium text-[var(--cr-text-1)]">{campaign.durationDays} days</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Daily budget</dt><dd className="font-medium text-[var(--cr-text-1)]">{currency.format(campaign.dailyBudget)}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Total budget</dt><dd className="font-medium text-[var(--cr-text-1)]">{currency.format(campaign.totalBudget)}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Start date</dt><dd className="font-medium text-[var(--cr-text-1)]">{campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('en-IN') : '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">End date</dt><dd className="font-medium text-[var(--cr-text-1)]">{campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('en-IN') : '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Age range</dt><dd className="font-medium text-[var(--cr-text-1)]">{campaign.ageMin && campaign.ageMax ? `${campaign.ageMin}–${campaign.ageMax}` : '—'}</dd></div>
            <div><dt className="text-[var(--cr-text-muted)]">Gender</dt><dd className="font-medium text-[var(--cr-text-1)] capitalize">{campaign.gender ?? '—'}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--cr-text-muted)]">Locations</dt>
              <dd className="font-medium text-[var(--cr-text-1)]">
                {Array.isArray(campaign.locations) && (campaign.locations as string[]).length > 0
                  ? (campaign.locations as string[]).join(', ')
                  : '—'}
              </dd>
            </div>
          </dl>
          {campaign.bannerUrl && (
            <div className="relative mt-4 h-40 w-full overflow-hidden rounded-xl">
              <Image src={campaign.bannerUrl} alt="Campaign banner" fill className="object-cover" unoptimized />
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-5 shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
          <h3 className="mb-4 text-sm font-semibold text-[var(--cr-text-1)]">Advertiser</h3>
          <div className="flex items-center gap-3">
            {campaign.advertiser.profileImage ? (
              <div className="relative h-11 w-11 overflow-hidden rounded-full">
                <Image src={campaign.advertiser.profileImage} alt={campaign.advertiser.name} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)' }}>
                {campaign.advertiser.name.slice(0, 1).toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--cr-text-1)]">{campaign.advertiser.name || `@${campaign.advertiser.username}`}</p>
              <p className="truncate text-xs text-[var(--cr-text-muted)]">@{campaign.advertiser.username}</p>
              <p className="truncate text-xs text-[var(--cr-text-muted)]">{campaign.advertiser.email}</p>
            </div>
          </div>
          {campaign.reel && (
            <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--cr-border-soft)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">Linked Reel</p>
              <p className="mt-1 text-sm font-medium text-[var(--cr-text-1)]">{campaign.reel.title}</p>
            </div>
          )}
          {campaign.payments.length > 0 && (
            <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--cr-border-soft)' }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">Payment History</p>
              <div className="flex flex-col gap-2">
                {campaign.payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--cr-text-2)]">{new Date(p.createdAt).toLocaleDateString('en-IN')} · {p.status}</span>
                    <span className="font-semibold text-[var(--cr-text-1)]">{currency.format(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border shadow-premium" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="text-sm font-semibold text-[var(--cr-text-1)]">Leads ({campaign.leads.length})</h3>
          <AddLeadModal campaignId={campaign.id} />
        </div>
        {campaign.leads.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No leads yet" message="Leads submitted by viewers of this campaign will show up here." icon={Target} />
          </div>
        ) : (
          <div className="overflow-x-auto p-5 pt-3">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--cr-border)' }}>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">Name</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">Mobile</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">Email</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">Status</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">Received</th>
                </tr>
              </thead>
              <tbody>
                {campaign.leads.map(l => {
                  const cfg = LEAD_STATUS_CFG[l.status]
                  return (
                    <tr key={l.id} className="border-b last:border-0" style={{ borderColor: 'var(--cr-border-soft)' }}>
                      <td className="px-3 py-2.5 font-medium text-[var(--cr-text-1)]">{l.name}</td>
                      <td className="px-3 py-2.5 text-[var(--cr-text-2)]">{l.mobile}</td>
                      <td className="px-3 py-2.5 text-[var(--cr-text-2)]">{l.email ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[var(--cr-text-2)]">{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
