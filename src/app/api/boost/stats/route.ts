import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { CampaignStatus } from '@/generated/prisma'
import type { AudienceData, BoostCampaignRow } from '@/types/campaign'

function mapStatus(s: CampaignStatus): BoostCampaignRow['status'] {
  switch (s) {
    case 'ACTIVE':          return 'active'
    case 'PENDING_PAYMENT': return 'pending'
    case 'DRAFT':           return 'draft'
    case 'PAUSED':          return 'paused'
    case 'COMPLETED':       return 'completed'
    case 'CANCELLED':       return 'completed'
    case 'REJECTED':        return 'rejected'
    default:                return 'draft'
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [activeCnt, draftCnt, analyticsAgg, campaigns] = await Promise.all([
      prisma.campaign.count({
        where: { userId: session.userId, status: 'ACTIVE' },
      }),
      prisma.campaign.count({
        where: { userId: session.userId, status: 'DRAFT' },
      }),
      prisma.campaignAnalytics.aggregate({
        where:  { campaign: { userId: session.userId } },
        _sum: {
          impressions:     true,
          clicks:          true,
          spend:           true,
          followersGained: true,
        },
      }),
      prisma.campaign.findMany({
        where:   { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        take:    50,
        select: {
          id:          true,
          name:        true,
          status:      true,
          totalBudget: true,
          audienceData:true,
          createdAt:   true,
          analytics:   {
            select: {
              impressions: true,
              clicks:      true,
            },
          },
        },
      }),
    ])

    const rows: BoostCampaignRow[] = campaigns.map(c => ({
      id:          c.id,
      name:        c.name,
      platform:    (c.audienceData as AudienceData).platform ?? 'cookreels',
      status:      mapStatus(c.status),
      budget:      Number(c.totalBudget),
      impressions: c.analytics?.impressions ?? 0,
      clicks:      c.analytics?.clicks ?? 0,
      createdAt:   c.createdAt.toISOString(),
    }))

    return NextResponse.json({
      activeCampaigns:   activeCnt,
      draftCampaigns:    draftCnt,
      totalImpressions:  analyticsAgg._sum.impressions     ?? 0,
      totalClicks:       analyticsAgg._sum.clicks          ?? 0,
      totalSpend:        Number(analyticsAgg._sum.spend    ?? 0),
      totalLeads:        analyticsAgg._sum.followersGained ?? 0,
      campaigns:         rows,
    })
  } catch (error) {
    console.error('[GET /api/boost/stats]', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
