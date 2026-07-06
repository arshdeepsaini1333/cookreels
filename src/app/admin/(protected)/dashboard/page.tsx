import type { Metadata } from 'next'
import { DollarSign, Megaphone, ClipboardList, Building2, Users, TrendingUp, Eye, ListChecks } from 'lucide-react'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { KpiCard } from '@/components/admin/dashboard/KpiCard'
import { AdvertiserActivityChart } from '@/components/admin/charts/AdvertiserActivityChart'
import { MonthlyRevenueChart } from '@/components/admin/charts/MonthlyRevenueChart'
import { RecentActivityFeed } from '@/components/admin/dashboard/RecentActivityFeed'
import {
  getDashboardStats,
  getMonthlyAdvertiserActivity,
  getMonthlyRevenue,
  getRecentActivity,
} from '@/lib/admin/dashboard-stats'

export const metadata: Metadata = { title: 'Dashboard | CookReels Admin' }

const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-IN')

export default async function AdminDashboardPage() {
  const [stats, advertiserActivity, monthlyRevenue, activity] = await Promise.all([
    getDashboardStats(),
    getMonthlyAdvertiserActivity(),
    getMonthlyRevenue(),
    getRecentActivity(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" breadcrumb={[{ label: 'Admin' }, { label: 'Dashboard' }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard label="Amount Received" value={currency.format(stats.totalRevenue)} icon={DollarSign} />
        <KpiCard label="Total Impressions Sold" value={number.format(stats.totalImpressions)} icon={Eye} />
        <KpiCard label="Total Campaigns" value={number.format(stats.totalCampaigns)} icon={ListChecks} />
        <KpiCard label="Active Campaigns" value={number.format(stats.activeCampaigns)} icon={Megaphone} />
        <KpiCard label="Draft Campaigns" value={number.format(stats.draftCampaigns)} icon={ClipboardList} />
        <KpiCard label="Active Advertisers" value={number.format(stats.activeAdvertisers)} icon={Building2} />
        <KpiCard label="Active Users" value={number.format(stats.activeUsers)} icon={Users} />
        <KpiCard label="Today's Ad Spend" value={currency.format(stats.todaysAdSpend)} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdvertiserActivityChart data={advertiserActivity} />
        <MonthlyRevenueChart data={monthlyRevenue} />
      </div>

      <div
        className="rounded-2xl border p-5 shadow-premium"
        style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
      >
        <h3 className="mb-2 text-sm font-semibold text-[var(--cr-text-1)]">Recent Activity</h3>
        <RecentActivityFeed items={activity} />
      </div>
    </div>
  )
}
