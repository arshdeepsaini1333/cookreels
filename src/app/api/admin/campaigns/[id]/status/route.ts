import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin/session'
import { canAccess } from '@/lib/admin/permissions'
import { prisma } from '@/lib/prisma'
import type { CampaignStatus } from '@/generated/prisma'

type Params = { params: Promise<{ id: string }> }

const StatusSchema = z.object({
  action: z.enum(['approve', 'reject', 'pause', 'resume', 'complete', 'cancel']),
})

// Allowed transitions from the admin console: [currentStatus] -> allowed admin actions.
// Admins can additionally reject a campaign under review, and reconsider a
// rejected one back to live — powers the regular advertiser-facing endpoint doesn't have.
const TRANSITIONS: Record<CampaignStatus, string[]> = {
  DRAFT:           ['approve', 'reject', 'cancel'],
  PENDING_PAYMENT: ['approve', 'reject', 'cancel'],
  ACTIVE:          ['pause', 'complete', 'cancel'],
  PAUSED:          ['resume', 'complete', 'cancel'],
  REJECTED:        ['approve', 'cancel'],
  COMPLETED:       [],
  CANCELLED:       [],
}

const ACTION_TO_STATUS: Record<string, CampaignStatus> = {
  approve:  'ACTIVE',
  reject:   'REJECTED',
  pause:    'PAUSED',
  resume:   'ACTIVE',
  complete: 'COMPLETED',
  cancel:   'CANCELLED',
}

// ─── PATCH /api/admin/campaigns/[id]/status ──────────────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccess(admin.role, 'campaigns')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = StatusSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const { action } = result.data

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { status: true, startDate: true, durationDays: true },
  })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const allowed = TRANSITIONS[campaign.status] ?? []
  if (!allowed.includes(action)) {
    return NextResponse.json(
      { error: `Cannot ${action} a campaign with status ${campaign.status}` },
      { status: 409 },
    )
  }

  try {
    const newStatus = ACTION_TO_STATUS[action]

    // Going live (re)computes the flight window from today, unless one is already set.
    let extraData: { startDate?: Date; endDate?: Date } = {}
    if (action === 'approve') {
      const startDate = campaign.startDate ?? new Date()
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + campaign.durationDays)
      extraData = { startDate, endDate }
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: newStatus, ...extraData },
      select: { id: true, status: true, updatedAt: true },
    })

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('[PATCH /api/admin/campaigns/[id]/status]', error)
    return NextResponse.json({ error: 'Failed to update campaign status' }, { status: 500 })
  }
}
