import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { CampaignStatus } from '@/generated/prisma'
import type { AudienceData } from '@/types/campaign'
import { computeSpend } from '@/lib/campaignSpend'

type Params = { params: Promise<{ id: string }> }

function mapStatus(s: CampaignStatus) {
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

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId: session.userId },
      select: {
        id:           true,
        name:         true,
        status:       true,
        audienceData: true,
        totalBudget:  true,
        dailyBudget:  true,
        impressions:  true,
        startDate:    true,
        endDate:      true,
        createdAt:    true,
        analytics: {
          select: {
            impressions: true,
            clicks:      true,
          },
        },
        leads: {
          orderBy: { createdAt: 'desc' },
          select: {
            id:        true,
            name:      true,
            mobile:    true,
            email:     true,
            notes:     true,
            status:    true,
            createdAt: true,
          },
        },
      },
    })

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const usedImpressions = campaign.analytics?.impressions ?? 0
    const purchasedImpressions = campaign.impressions ?? 0

    return NextResponse.json({
      campaign: {
        id:                  campaign.id,
        name:                campaign.name,
        status:              mapStatus(campaign.status),
        platform:            (campaign.audienceData as AudienceData).platform ?? 'cookreels',
        totalBudget:         Number(campaign.totalBudget),
        dailyBudget:         Number(campaign.dailyBudget),
        purchasedImpressions,
        usedImpressions,
        remainingImpressions: Math.max(purchasedImpressions - usedImpressions, 0),
        clicks:              campaign.analytics?.clicks ?? 0,
        spend:               computeSpend(usedImpressions),
        startDate:           campaign.startDate?.toISOString() ?? null,
        endDate:             campaign.endDate?.toISOString()   ?? null,
        createdAt:           campaign.createdAt.toISOString(),
      },
      leads: campaign.leads.map(l => ({
        id:        l.id,
        name:      l.name,
        mobile:    l.mobile,
        email:     l.email,
        notes:     l.notes,
        status:    l.status,
        createdAt: l.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[GET /api/boost/campaigns/[id]/leads]', error)
    return NextResponse.json({ error: 'Failed to fetch campaign leads' }, { status: 500 })
  }
}
