import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin/session'
import { canAccess } from '@/lib/admin/permissions'
import { getAdminCampaigns } from '@/lib/admin/campaigns'
import { prisma } from '@/lib/prisma'
import type { CampaignStatus, Prisma } from '@/generated/prisma'

const VALID_STATUSES: CampaignStatus[] = [
  'DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'REJECTED',
]

const OBJECTIVES = [
  'LEADS', 'WEBSITE_TRAFFIC', 'APP_INSTALLS', 'VIDEO_VIEWS', 'PROFILE_VISITS',
  'BRAND_AWARENESS', 'ENGAGEMENT', 'REACH', 'CONVERSIONS',
] as const

const CreateCampaignSchema = z.object({
  advertiser:   z.string().min(1, 'Advertiser email or username is required'),
  name:         z.string().min(1, 'Name is required').max(100),
  objective:    z.enum(OBJECTIVES),
  reelId:       z.string().optional(),
  durationDays: z.number().int().positive(),
  dailyBudget:  z.number().positive(),
  totalBudget:  z.number().positive(),
  impressions:  z.number().int().positive(),
  startDate:    z.string().nullable().optional(),
  endDate:      z.string().nullable().optional(),
  bannerUrl:    z.string().nullable().optional(),
  adVideoUrl:   z.string().nullable().optional(),
  ageMin:       z.number().int().min(13).max(100).nullable().optional(),
  ageMax:       z.number().int().min(13).max(100).nullable().optional(),
  gender:       z.string().nullable().optional(),
  locations:    z.array(z.string()).optional(),
})

// ─── GET /api/admin/campaigns ─────────────────────────────────────────────────

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccess(admin.role, 'campaigns')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const status = statusParam && VALID_STATUSES.includes(statusParam as CampaignStatus)
    ? (statusParam as CampaignStatus)
    : undefined
  const search = searchParams.get('search') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))

  try {
    const result = await getAdminCampaigns({ status, search, page, limit })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/admin/campaigns]', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

// ─── POST /api/admin/campaigns ────────────────────────────────────────────────

export async function POST(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccess(admin.role, 'campaigns')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = CreateCampaignSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const data = result.data

  const advertiser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: data.advertiser, mode: 'insensitive' } },
        { username: { equals: data.advertiser, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  })
  if (!advertiser) {
    return NextResponse.json({ error: 'No user found with that email or username' }, { status: 404 })
  }

  if (data.reelId) {
    const reel = await prisma.reel.findFirst({ where: { id: data.reelId, userId: advertiser.id }, select: { id: true } })
    if (!reel) return NextResponse.json({ error: 'Reel not found or not owned by that advertiser' }, { status: 404 })
  }

  try {
    const campaign = await prisma.campaign.create({
      data: {
        userId:       advertiser.id,
        reelId:       data.reelId ?? null,
        name:         data.name,
        objective:    data.objective,
        audienceData: {} as Prisma.InputJsonValue,
        locations:    (data.locations ?? []) as Prisma.InputJsonValue,
        ageMin:       data.ageMin ?? null,
        ageMax:       data.ageMax ?? null,
        gender:       data.gender ?? null,
        durationDays: data.durationDays,
        dailyBudget:  data.dailyBudget,
        totalBudget:  data.totalBudget,
        impressions:  data.impressions,
        startDate:    data.startDate ? new Date(data.startDate) : null,
        endDate:      data.endDate ? new Date(data.endDate) : null,
        bannerUrl:    data.bannerUrl ?? null,
        adVideoUrl:   data.adVideoUrl ?? null,
        status:       'DRAFT',
      },
      select: { id: true },
    })

    return NextResponse.json({ id: campaign.id }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/campaigns]', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}
