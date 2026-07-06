import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin/session'
import { canAccess } from '@/lib/admin/permissions'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// Both optional, but at least one must be a positive amount to add.
const AddStatsSchema = z.object({
  impressions: z.number().int().min(0).optional(),
  clicks:      z.number().int().min(0).optional(),
}).refine(d => (d.impressions ?? 0) > 0 || (d.clicks ?? 0) > 0, {
  message: 'Enter at least one impressions or clicks amount to add',
})

// ─── PATCH /api/admin/campaigns/[id]/analytics ───────────────────────────────
// Increments (not overwrites) impressions/clicks — mirrors logging additional
// activity reported back from an external ad platform onto the running totals.

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccess(admin.role, 'campaigns')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = AddStatsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { id: true } })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const { impressions = 0, clicks = 0 } = result.data

  try {
    const analytics = await prisma.campaignAnalytics.upsert({
      where:  { campaignId: id },
      create: { campaignId: id, impressions, clicks },
      update: { impressions: { increment: impressions }, clicks: { increment: clicks } },
      select: { impressions: true, clicks: true, views: true, likes: true, followersGained: true, spend: true },
    })

    return NextResponse.json({
      impressions: analytics.impressions,
      clicks: analytics.clicks,
      views: analytics.views,
      likes: analytics.likes,
      followersGained: analytics.followersGained,
      spend: Number(analytics.spend),
    })
  } catch (error) {
    console.error('[PATCH /api/admin/campaigns/[id]/analytics]', error)
    return NextResponse.json({ error: 'Failed to update campaign analytics' }, { status: 500 })
  }
}
