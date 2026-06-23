import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { CampaignStatus } from '@/generated/prisma'

type Params = { params: Promise<{ id: string }> }

const StatusSchema = z.object({
  action: z.enum(['pause', 'resume', 'cancel', 'complete']),
})

// Allowed transitions: [currentStatus] -> allowedActions
const TRANSITIONS: Record<CampaignStatus, string[]> = {
  DRAFT:           ['cancel'],
  PENDING_PAYMENT: ['cancel'],
  ACTIVE:          ['pause', 'cancel', 'complete'],
  PAUSED:          ['resume', 'cancel'],
  COMPLETED:       [],
  CANCELLED:       [],
  REJECTED:        [],
}

const ACTION_TO_STATUS: Record<string, CampaignStatus> = {
  pause:    'PAUSED',
  resume:   'ACTIVE',
  cancel:   'CANCELLED',
  complete: 'COMPLETED',
}

// ─── PATCH /api/campaigns/[id]/status ────────────────────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: session.userId },
    select: { status: true },
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
    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, status: true, updatedAt: true },
    })

    return NextResponse.json({
      id:        updated.id,
      status:    updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('[PATCH /api/campaigns/[id]/status]', error)
    return NextResponse.json({ error: 'Failed to update campaign status' }, { status: 500 })
  }
}
