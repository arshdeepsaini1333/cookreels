import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'
import type { AudienceData } from '@/types/campaign'

type Params = { params: Promise<{ id: string }> }

const UpdateCampaignSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  reelId:       z.string().nullable().optional(),
  objective:    z.enum(['VIEWS', 'LIKES', 'FOLLOWERS', 'WEBSITE_CLICKS']).optional(),
  audienceData: z.record(z.string(), z.unknown()).optional(),
  locations:    z.array(z.string()).optional(),
  ageMin:       z.number().int().min(13).max(65).nullable().optional(),
  ageMax:       z.number().int().min(13).max(65).nullable().optional(),
  gender:       z.string().nullable().optional(),
  durationDays: z.number().int().positive().optional(),
  dailyBudget:  z.number().positive().optional(),
  totalBudget:  z.number().positive().optional(),
  startDate:    z.string().nullable().optional(),
  endDate:      z.string().nullable().optional(),
})

// ─── GET /api/campaigns/[id] ─────────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId: session.userId },
      select: {
        id:          true,
        name:        true,
        objective:   true,
        status:      true,
        totalBudget: true,
        dailyBudget: true,
        durationDays:true,
        startDate:   true,
        endDate:     true,
        reelId:      true,
        paymentId:   true,
        audienceData:true,
        locations:   true,
        ageMin:      true,
        ageMax:      true,
        gender:      true,
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
        payments: {
          orderBy: { createdAt: 'desc' },
          take:    1,
          select: {
            id:               true,
            razorpayOrderId:  true,
            razorpayPaymentId:true,
            amount:           true,
            currency:         true,
            status:           true,
            paymentMethod:    true,
            createdAt:        true,
          },
        },
      },
    })

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // Fetch reel thumbnail if needed
    let reelThumbnail: string | null = null
    if (campaign.reelId) {
      const reel = await prisma.reel.findUnique({
        where:  { id: campaign.reelId },
        select: { thumbnailUrl: true },
      })
      reelThumbnail = reel?.thumbnailUrl ?? null
    }

    const payment = campaign.payments[0] ?? null

    return NextResponse.json({
      id:           campaign.id,
      name:         campaign.name,
      objective:    campaign.objective,
      status:       campaign.status,
      totalBudget:  Number(campaign.totalBudget),
      dailyBudget:  Number(campaign.dailyBudget),
      durationDays: campaign.durationDays,
      startDate:    campaign.startDate?.toISOString() ?? null,
      endDate:      campaign.endDate?.toISOString()   ?? null,
      reelId:       campaign.reelId,
      reelThumbnail,
      platform:     (campaign.audienceData as AudienceData).platform ?? 'cookreels',
      audienceData: campaign.audienceData,
      locations:    campaign.locations,
      ageMin:       campaign.ageMin,
      ageMax:       campaign.ageMax,
      gender:       campaign.gender,
      analytics: campaign.analytics ? {
        impressions:     campaign.analytics.impressions,
        views:           campaign.analytics.views,
        likes:           campaign.analytics.likes,
        clicks:          campaign.analytics.clicks,
        followersGained: campaign.analytics.followersGained,
        spend:           Number(campaign.analytics.spend),
      } : null,
      payment: payment ? {
        id:               payment.id,
        razorpayOrderId:  payment.razorpayOrderId,
        razorpayPaymentId:payment.razorpayPaymentId,
        amount:           Number(payment.amount),
        currency:         payment.currency,
        status:           payment.status,
        paymentMethod:    payment.paymentMethod,
        createdAt:        payment.createdAt.toISOString(),
      } : null,
      paymentId:    campaign.paymentId,
      createdAt:    campaign.createdAt.toISOString(),
      updatedAt:    campaign.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('[GET /api/campaigns/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

// ─── PATCH /api/campaigns/[id] ────────────────────────────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = UpdateCampaignSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const existing = await prisma.campaign.findFirst({
    where:  { id, userId: session.userId },
    select: { status: true },
  })

  if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (!['DRAFT', 'PAUSED'].includes(existing.status)) {
    return NextResponse.json({ error: 'Only DRAFT or PAUSED campaigns can be edited' }, { status: 409 })
  }

  const data = result.data

  if (data.reelId) {
    const reel = await prisma.reel.findFirst({
      where:  { id: data.reelId, userId: session.userId },
      select: { id: true },
    })
    if (!reel) return NextResponse.json({ error: 'Reel not found or not owned by you' }, { status: 404 })
  }

  // Build update payload using unchecked input to allow direct FK writes
  const updateData: Prisma.CampaignUncheckedUpdateInput = {}
  if (data.name         !== undefined) updateData.name         = data.name
  if (data.reelId       !== undefined) updateData.reelId       = data.reelId
  if (data.objective    !== undefined) updateData.objective    = data.objective
  if (data.audienceData !== undefined) updateData.audienceData = data.audienceData as Prisma.InputJsonValue
  if (data.locations    !== undefined) updateData.locations    = data.locations as Prisma.InputJsonValue
  if (data.ageMin       !== undefined) updateData.ageMin       = data.ageMin
  if (data.ageMax       !== undefined) updateData.ageMax       = data.ageMax
  if (data.gender       !== undefined) updateData.gender       = data.gender
  if (data.durationDays !== undefined) updateData.durationDays = data.durationDays
  if (data.dailyBudget  !== undefined) updateData.dailyBudget  = data.dailyBudget
  if (data.totalBudget  !== undefined) updateData.totalBudget  = data.totalBudget
  if (data.startDate    !== undefined) updateData.startDate    = data.startDate ? new Date(data.startDate) : null
  if (data.endDate      !== undefined) updateData.endDate      = data.endDate   ? new Date(data.endDate)   : null

  try {
    const updated = await prisma.campaign.update({
      where:  { id },
      data:   updateData,
      select: { id: true, updatedAt: true, status: true },
    })
    return NextResponse.json({ id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() })
  } catch (error) {
    console.error('[PATCH /api/campaigns/[id]]', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

// ─── DELETE /api/campaigns/[id] ───────────────────────────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const campaign = await prisma.campaign.findFirst({
    where:  { id, userId: session.userId },
    select: { status: true },
  })

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  try {
    await prisma.campaign.delete({ where: { id } })
    return NextResponse.json({ message: 'Campaign deleted' })
  } catch (error) {
    console.error('[DELETE /api/campaigns/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
