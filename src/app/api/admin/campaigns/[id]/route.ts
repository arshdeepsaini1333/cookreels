import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin/session'
import { canAccess } from '@/lib/admin/permissions'
import { getAdminCampaignById } from '@/lib/admin/campaigns'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'

type Params = { params: Promise<{ id: string }> }

const OBJECTIVES = [
  'LEADS', 'WEBSITE_TRAFFIC', 'APP_INSTALLS', 'VIDEO_VIEWS', 'PROFILE_VISITS',
  'BRAND_AWARENESS', 'ENGAGEMENT', 'REACH', 'CONVERSIONS',
] as const

const UpdateCampaignSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  objective:    z.enum(OBJECTIVES).optional(),
  reelId:       z.string().nullable().optional(),
  durationDays: z.number().int().positive().optional(),
  dailyBudget:  z.number().positive().optional(),
  totalBudget:  z.number().positive().optional(),
  impressions:  z.number().int().positive().optional(),
  startDate:    z.string().nullable().optional(),
  endDate:      z.string().nullable().optional(),
  bannerUrl:    z.string().nullable().optional(),
  adVideoUrl:   z.string().nullable().optional(),
  ageMin:       z.number().int().min(13).max(100).nullable().optional(),
  ageMax:       z.number().int().min(13).max(100).nullable().optional(),
  gender:       z.string().nullable().optional(),
  locations:    z.array(z.string()).optional(),
})

// ─── GET /api/admin/campaigns/[id] ───────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccess(admin.role, 'campaigns')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  try {
    const campaign = await getAdminCampaignById(id)
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    return NextResponse.json(campaign)
  } catch (error) {
    console.error('[GET /api/admin/campaigns/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

// ─── PATCH /api/admin/campaigns/[id] ─────────────────────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccess(admin.role, 'campaigns')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = UpdateCampaignSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const existing = await prisma.campaign.findUnique({ where: { id }, select: { userId: true } })
  if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const data = result.data

  if (data.reelId) {
    const reel = await prisma.reel.findFirst({ where: { id: data.reelId, userId: existing.userId }, select: { id: true } })
    if (!reel) return NextResponse.json({ error: 'Reel not found or not owned by this advertiser' }, { status: 404 })
  }

  const updateData: Prisma.CampaignUncheckedUpdateInput = {}
  if (data.name         !== undefined) updateData.name         = data.name
  if (data.objective    !== undefined) updateData.objective    = data.objective
  if (data.reelId       !== undefined) updateData.reelId       = data.reelId
  if (data.durationDays !== undefined) updateData.durationDays = data.durationDays
  if (data.dailyBudget  !== undefined) updateData.dailyBudget  = data.dailyBudget
  if (data.totalBudget  !== undefined) updateData.totalBudget  = data.totalBudget
  if (data.impressions  !== undefined) updateData.impressions  = data.impressions
  if (data.startDate    !== undefined) updateData.startDate    = data.startDate ? new Date(data.startDate) : null
  if (data.endDate      !== undefined) updateData.endDate      = data.endDate ? new Date(data.endDate) : null
  if (data.bannerUrl    !== undefined) updateData.bannerUrl    = data.bannerUrl
  if (data.adVideoUrl   !== undefined) updateData.adVideoUrl   = data.adVideoUrl
  if (data.ageMin       !== undefined) updateData.ageMin       = data.ageMin
  if (data.ageMax       !== undefined) updateData.ageMax       = data.ageMax
  if (data.gender       !== undefined) updateData.gender       = data.gender
  if (data.locations    !== undefined) updateData.locations    = data.locations as Prisma.InputJsonValue

  try {
    const updated = await prisma.campaign.update({
      where: { id },
      data: updateData,
      select: { id: true, status: true, updatedAt: true },
    })
    return NextResponse.json({ id: updated.id, status: updated.status, updatedAt: updated.updatedAt.toISOString() })
  } catch (error) {
    console.error('[PATCH /api/admin/campaigns/[id]]', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

// ─── DELETE /api/admin/campaigns/[id] ────────────────────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccess(admin.role, 'campaigns')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { id: true } })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  try {
    await prisma.campaign.delete({ where: { id } })
    return NextResponse.json({ message: 'Campaign deleted' })
  } catch (error) {
    console.error('[DELETE /api/admin/campaigns/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
