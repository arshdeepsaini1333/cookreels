import { prisma } from '@/lib/prisma'
import { computeSpend } from '@/lib/campaignSpend'

// ─── List ─────────────────────────────────────────────────────────────────────

export type AdminAdvertiserListFilters = {
  search?: string
  page?: number
  limit?: number
}

export type AdminAdvertiserListItem = {
  id: string
  name: string
  username: string
  email: string
  campaignCount: number
  activeCampaignCount: number
  totalBudget: number
  totalSpend: number
  joinedAt: Date
}

export type AdminAdvertiserSummary = {
  totalAdvertisers: number
  totalCampaigns: number
  totalSpend: number
}

// Campaigns don't carry an advertiser-level rollup, so every advertiser (a
// user with at least one campaign) is derived by grouping campaigns by
// userId in memory — same approach as getMonthlyAdvertiserActivity.
export async function getAdminAdvertisers(filters: AdminAdvertiserListFilters) {
  const page = Math.max(1, filters.page ?? 1)
  const limit = Math.min(50, Math.max(1, filters.limit ?? 20))

  const campaigns = await prisma.campaign.findMany({
    select: {
      status: true,
      totalBudget: true,
      analytics: { select: { impressions: true } },
      user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, createdAt: true } },
    },
  })

  const byUser = new Map<string, AdminAdvertiserListItem>()
  for (const c of campaigns) {
    const u = c.user
    let entry = byUser.get(u.id)
    if (!entry) {
      entry = {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        username: u.username,
        email: u.email,
        campaignCount: 0,
        activeCampaignCount: 0,
        totalBudget: 0,
        totalSpend: 0,
        joinedAt: u.createdAt,
      }
      byUser.set(u.id, entry)
    }
    entry.campaignCount += 1
    if (c.status === 'ACTIVE') entry.activeCampaignCount += 1
    entry.totalBudget += Number(c.totalBudget)
    entry.totalSpend += computeSpend(c.analytics?.impressions ?? 0)
  }

  let items = Array.from(byUser.values())

  if (filters.search) {
    const q = filters.search.toLowerCase()
    items = items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.username.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q)
    )
  }

  items.sort((a, b) => b.totalSpend - a.totalSpend)

  const summary: AdminAdvertiserSummary = {
    totalAdvertisers: byUser.size,
    totalCampaigns: campaigns.length,
    totalSpend: Array.from(byUser.values()).reduce((sum, i) => sum + i.totalSpend, 0),
  }

  const total = items.length
  const skip = (page - 1) * limit
  const pageItems = items.slice(skip, skip + limit)

  return { items: pageItems, total, limit, summary }
}
