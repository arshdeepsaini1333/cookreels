import { prisma } from '@/lib/prisma'
import type { CampaignObjective, CampaignStatus, LeadStatus, Prisma } from '@/generated/prisma'
import { computeSpend } from '@/lib/campaignSpend'

// ─── List ─────────────────────────────────────────────────────────────────────

export type AdminCampaignListFilters = {
  status?: CampaignStatus
  search?: string
  page?: number
  limit?: number
}

export type AdminCampaignListItem = {
  id: string
  name: string
  objective: CampaignObjective
  status: CampaignStatus
  dailyBudget: number
  totalBudget: number
  durationDays: number
  impressions: number
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  advertiser: { id: string; username: string; email: string; name: string }
  reelThumbnail: string | null
  analytics: { impressions: number; clicks: number; spend: number } | null
  leadCount: number
}

export async function getAdminCampaigns(filters: AdminCampaignListFilters) {
  const page = Math.max(1, filters.page ?? 1)
  const limit = Math.min(50, Math.max(1, filters.limit ?? 20))
  const skip = (page - 1) * limit

  const where: Prisma.CampaignWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { user: { username: { contains: filters.search, mode: 'insensitive' } } },
            { user: { email: { contains: filters.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        name: true,
        objective: true,
        status: true,
        dailyBudget: true,
        totalBudget: true,
        durationDays: true,
        impressions: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        user: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
        reel: { select: { thumbnailUrl: true } },
        analytics: { select: { impressions: true, clicks: true } },
        _count: { select: { leads: true } },
      },
    }),
    prisma.campaign.count({ where }),
  ])

  const items: AdminCampaignListItem[] = campaigns.map(c => ({
    id: c.id,
    name: c.name,
    objective: c.objective,
    status: c.status,
    dailyBudget: Number(c.dailyBudget),
    totalBudget: Number(c.totalBudget),
    durationDays: c.durationDays,
    impressions: c.impressions,
    startDate: c.startDate,
    endDate: c.endDate,
    createdAt: c.createdAt,
    advertiser: {
      id: c.user.id,
      username: c.user.username,
      email: c.user.email,
      name: `${c.user.firstName} ${c.user.lastName}`.trim(),
    },
    reelThumbnail: c.reel?.thumbnailUrl ?? null,
    analytics: c.analytics
      ? { impressions: c.analytics.impressions, clicks: c.analytics.clicks, spend: computeSpend(c.analytics.impressions) }
      : null,
    leadCount: c._count.leads,
  }))

  return { items, total, page, limit }
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function getAdminCampaignById(id: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, profileImage: true } },
      reel: { select: { id: true, title: true, thumbnailUrl: true } },
      analytics: true,
      payments: { orderBy: { createdAt: 'desc' } },
      leads: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!campaign) return null

  return {
    id: campaign.id,
    name: campaign.name,
    objective: campaign.objective,
    status: campaign.status,
    audienceData: campaign.audienceData,
    locations: campaign.locations,
    ageMin: campaign.ageMin,
    ageMax: campaign.ageMax,
    gender: campaign.gender,
    bannerUrl: campaign.bannerUrl,
    adVideoUrl: campaign.adVideoUrl,
    dailyBudget: Number(campaign.dailyBudget),
    totalBudget: Number(campaign.totalBudget),
    durationDays: campaign.durationDays,
    impressions: campaign.impressions,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    advertiser: {
      id: campaign.user.id,
      username: campaign.user.username,
      email: campaign.user.email,
      name: `${campaign.user.firstName} ${campaign.user.lastName}`.trim(),
      profileImage: campaign.user.profileImage,
    },
    reel: campaign.reel,
    analytics: campaign.analytics
      ? {
          impressions: campaign.analytics.impressions,
          views: campaign.analytics.views,
          likes: campaign.analytics.likes,
          clicks: campaign.analytics.clicks,
          followersGained: campaign.analytics.followersGained,
          spend: computeSpend(campaign.analytics.impressions),
        }
      : null,
    payments: campaign.payments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      paymentMethod: p.paymentMethod,
      createdAt: p.createdAt,
    })),
    leads: campaign.leads.map(l => ({
      id: l.id,
      name: l.name,
      mobile: l.mobile,
      email: l.email,
      notes: l.notes,
      status: l.status as LeadStatus,
      createdAt: l.createdAt,
    })),
  }
}

export type AdminCampaignDetail = NonNullable<Awaited<ReturnType<typeof getAdminCampaignById>>>
