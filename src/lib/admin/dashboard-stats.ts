import { prisma } from '@/lib/prisma'

export type DashboardStats = {
  totalRevenue: number
  totalCampaigns: number
  totalImpressions: number
  activeCampaigns: number
  draftCampaigns: number
  activeAdvertisers: number
  activeUsers: number
  todaysAdSpend: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    revenueAgg,
    totalCampaigns,
    impressionsAgg,
    activeCampaigns,
    draftCampaigns,
    advertiserIds,
    activeUsers,
    todaysSpendAgg,
  ] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
    prisma.campaign.count(),
    prisma.campaign.aggregate({ _sum: { impressions: true } }),
    prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    prisma.campaign.count({ where: { status: 'DRAFT' } }),
    prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'SUCCESS', createdAt: { gte: startOfToday } },
    }),
  ])

  return {
    totalRevenue: Number(revenueAgg._sum.amount ?? 0),
    totalCampaigns,
    totalImpressions: impressionsAgg._sum.impressions ?? 0,
    activeCampaigns,
    draftCampaigns,
    activeAdvertisers: advertiserIds.length,
    activeUsers,
    todaysAdSpend: Number(todaysSpendAgg._sum.amount ?? 0),
  }
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function buildMonthRange(startKey: string, endKey: string): string[] {
  const [startYear, startMonth] = startKey.split('-').map(Number)
  const [endYear, endMonth] = endKey.split('-').map(Number)
  const months: string[] = []
  let year = startYear
  let month = startMonth
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}

export type MonthlyAdvertiserActivity = {
  month: string
  label: string
  newAdvertisers: number
  returningAdvertisers: number
}

// "Active as an advertiser" = ran at least one campaign that month. New vs
// returning is based on whether the month is the advertiser's first-ever
// campaign month, so the same person is "new" exactly once.
export async function getMonthlyAdvertiserActivity(): Promise<MonthlyAdvertiserActivity[]> {
  const campaigns = await prisma.campaign.findMany({
    select: { userId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  if (campaigns.length === 0) return []

  const firstMonthByUser = new Map<string, string>()
  const monthsByUser = new Map<string, Set<string>>()

  for (const campaign of campaigns) {
    const month = monthKey(campaign.createdAt)
    if (!firstMonthByUser.has(campaign.userId)) firstMonthByUser.set(campaign.userId, month)
    const months = monthsByUser.get(campaign.userId) ?? new Set<string>()
    months.add(month)
    monthsByUser.set(campaign.userId, months)
  }

  const range = buildMonthRange(monthKey(campaigns[0].createdAt), monthKey(new Date()))

  return range.map(month => {
    let newAdvertisers = 0
    let returningAdvertisers = 0
    for (const [userId, months] of monthsByUser) {
      if (!months.has(month)) continue
      if (firstMonthByUser.get(userId) === month) newAdvertisers += 1
      else returningAdvertisers += 1
    }
    return { month, label: monthLabel(month), newAdvertisers, returningAdvertisers }
  })
}

export type MonthlyRevenue = {
  month: string
  label: string
  amount: number
}

export async function getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
  const payments = await prisma.payment.findMany({
    where: { status: 'SUCCESS' },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  if (payments.length === 0) return []

  const totalsByMonth = new Map<string, number>()
  for (const payment of payments) {
    const month = monthKey(payment.createdAt)
    totalsByMonth.set(month, (totalsByMonth.get(month) ?? 0) + Number(payment.amount))
  }

  const range = buildMonthRange(monthKey(payments[0].createdAt), monthKey(new Date()))

  return range.map(month => ({
    month,
    label: monthLabel(month),
    amount: totalsByMonth.get(month) ?? 0,
  }))
}

export type ActivityItem = {
  id: string
  type: 'CAMPAIGN_CREATED' | 'USER_REGISTERED' | 'CONTENT_REPORTED'
  label: string
  createdAt: Date
}

// No moderation audit trail exists yet, so "Campaign Approved/Rejected" events
// aren't sourceable — only feed types backed by real rows are included here.
export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const [campaigns, users, reports] = await Promise.all([
    prisma.campaign.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, createdAt: true },
    }),
    prisma.report.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, createdAt: true },
    }),
  ])

  const items: ActivityItem[] = [
    ...campaigns.map(c => ({
      id: `campaign-${c.id}`,
      type: 'CAMPAIGN_CREATED' as const,
      label: `Campaign "${c.name}" created`,
      createdAt: c.createdAt,
    })),
    ...users.map(u => ({
      id: `user-${u.id}`,
      type: 'USER_REGISTERED' as const,
      label: `@${u.username} registered`,
      createdAt: u.createdAt,
    })),
    ...reports.map(r => ({
      id: `report-${r.id}`,
      type: 'CONTENT_REPORTED' as const,
      label: `${r.type.charAt(0)}${r.type.slice(1).toLowerCase()} reported`,
      createdAt: r.createdAt,
    })),
  ]

  return items
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
}
