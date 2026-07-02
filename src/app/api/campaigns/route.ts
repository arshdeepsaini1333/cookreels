import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { Prisma, CampaignStatus } from '@/generated/prisma'
import type { AudienceData, AudienceLocation } from '@/types/campaign'

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateCampaignSchema = z.object({
  name:         z.string().min(1, 'Name is required').max(100),
  reelId:       z.string().optional(),
  objective:    z.enum(['LEADS', 'WEBSITE_TRAFFIC', 'APP_INSTALLS', 'VIDEO_VIEWS', 'PROFILE_VISITS', 'BRAND_AWARENESS', 'ENGAGEMENT', 'REACH', 'CONVERSIONS']),
  audienceData: z.record(z.string(), z.unknown()).default({}),
  audienceId:   z.string().min(1, 'An audience is required'),
  durationDays: z.number().int().positive(),
  dailyBudget:  z.number().positive(),
  totalBudget:  z.number().positive(),
  impressions:  z.number().int().positive(),
  startDate:    z.string().nullable().optional(),
  endDate:      z.string().nullable().optional(),
  bannerUrl:    z.string().nullable().optional(),
  adVideoUrl:   z.string().nullable().optional(),
})

// ─── POST /api/campaigns ──────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = CreateCampaignSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const data = result.data

  // Validate reel ownership if provided
  if (data.reelId) {
    const reel = await prisma.reel.findFirst({
      where: { id: data.reelId, userId: session.userId },
      select: { id: true },
    })
    if (!reel) return NextResponse.json({ error: 'Reel not found or not owned by you' }, { status: 404 })
  }

  // Validate audience ownership and derive legacy targeting scalars from it
  const audience = await prisma.audience.findFirst({
    where: { id: data.audienceId, userId: session.userId },
    select: { id: true, gender: true, ageMin: true, ageMax: true, locations: true },
  })
  if (!audience) {
    return NextResponse.json({ error: 'Audience not found or not owned by you' }, { status: 404 })
  }

  const derivedLocations = ((audience.locations as AudienceLocation[] | null) ?? []).map(l => l.value)

  try {
    const campaign = await prisma.campaign.create({
      data: {
        userId:       session.userId,
        reelId:       data.reelId ?? null,
        name:         data.name,
        objective:    data.objective,
        audienceData: data.audienceData as Prisma.InputJsonValue,
        locations:    derivedLocations as Prisma.InputJsonValue,
        ageMin:       audience.ageMin,
        ageMax:       audience.ageMax,
        gender:       audience.gender,
        audiences:    { connect: { id: audience.id } },
        durationDays: data.durationDays,
        dailyBudget:  data.dailyBudget,
        totalBudget:  data.totalBudget,
        impressions:  data.impressions,
        startDate:    data.startDate ? new Date(data.startDate) : null,
        endDate:      data.endDate   ? new Date(data.endDate)   : null,
        bannerUrl:    data.bannerUrl  ?? null,
        adVideoUrl:   data.adVideoUrl ?? null,
        status:       'DRAFT',
      },
      select: {
        id:          true,
        name:        true,
        objective:   true,
        status:      true,
        totalBudget: true,
        dailyBudget: true,
        durationDays:true,
        impressions: true,
        startDate:   true,
        endDate:     true,
        reelId:      true,
        paymentId:   true,
        bannerUrl:   true,
        adVideoUrl:  true,
        createdAt:   true,
        updatedAt:   true,
      },
    })

    // Fetch reel thumbnail separately if needed
    let reelThumbnail: string | null = null
    if (campaign.reelId) {
      const reel = await prisma.reel.findUnique({
        where:  { id: campaign.reelId },
        select: { thumbnailUrl: true },
      })
      reelThumbnail = reel?.thumbnailUrl ?? null
    }

    return NextResponse.json({
      id:           campaign.id,
      name:         campaign.name,
      objective:    campaign.objective,
      status:       campaign.status,
      totalBudget:  Number(campaign.totalBudget),
      dailyBudget:  Number(campaign.dailyBudget),
      durationDays: campaign.durationDays,
      impressions:  campaign.impressions,
      startDate:    campaign.startDate?.toISOString() ?? null,
      endDate:      campaign.endDate?.toISOString()   ?? null,
      reelId:       campaign.reelId,
      reelThumbnail,
      platform:     (data.audienceData as AudienceData).platform ?? 'cookreels',
      bannerUrl:    campaign.bannerUrl,
      adVideoUrl:   campaign.adVideoUrl,
      analytics:    null,
      paymentId:    campaign.paymentId,
      createdAt:    campaign.createdAt.toISOString(),
      updatedAt:    campaign.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/campaigns]', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

// ─── GET /api/campaigns ───────────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10))
  const limit  = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))
  const skip   = (page - 1) * limit

  const VALID_STATUSES: CampaignStatus[] = ['DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'REJECTED']
  const statusFilter = statusParam && VALID_STATUSES.includes(statusParam as CampaignStatus)
    ? { status: statusParam as CampaignStatus }
    : {}

  try {
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: { userId: session.userId, ...statusFilter },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id:          true,
          name:        true,
          objective:   true,
          status:      true,
          totalBudget: true,
          dailyBudget: true,
          durationDays:true,
          impressions: true,
          startDate:   true,
          endDate:     true,
          reelId:      true,
          paymentId:   true,
          audienceData:true,
          createdAt:   true,
          updatedAt:   true,
          analytics: {
            select: {
              impressions:     true,
              views:           true,
              likes:           true,
              clicks:          true,
              followersGained: true,
              spend:           true,
            },
          },
        },
      }),
      prisma.campaign.count({ where: { userId: session.userId } }),
    ])

    const mapped = campaigns.map(c => ({
      id:           c.id,
      name:         c.name,
      objective:    c.objective,
      status:       c.status,
      totalBudget:  Number(c.totalBudget),
      dailyBudget:  Number(c.dailyBudget),
      durationDays: c.durationDays,
      impressions:  c.impressions,
      startDate:    c.startDate?.toISOString() ?? null,
      endDate:      c.endDate?.toISOString()   ?? null,
      reelId:       c.reelId,
      reelThumbnail:null as string | null,
      platform:     (c.audienceData as AudienceData).platform ?? 'cookreels',
      analytics: c.analytics ? {
        impressions:     c.analytics.impressions,
        views:           c.analytics.views,
        likes:           c.analytics.likes,
        clicks:          c.analytics.clicks,
        followersGained: c.analytics.followersGained,
        spend:           Number(c.analytics.spend),
      } : null,
      paymentId:    c.paymentId,
      createdAt:    c.createdAt.toISOString(),
      updatedAt:    c.updatedAt.toISOString(),
    }))

    return NextResponse.json({ campaigns: mapped, total, page, limit })
  } catch (error) {
    console.error('[GET /api/campaigns]', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}
