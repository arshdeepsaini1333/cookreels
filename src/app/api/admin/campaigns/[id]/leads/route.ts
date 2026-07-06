import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin/session'
import { canAccess } from '@/lib/admin/permissions'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// Mirrors the fields a Facebook/Google lead-gen form hands back: name, phone,
// optionally email, plus any free-text notes the advertiser wants attached.
const CreateLeadSchema = z.object({
  name:   z.string().min(1, 'Name is required').max(100),
  mobile: z.string().min(1, 'Mobile number is required').max(20),
  email:  z.string().email().nullable().optional().or(z.literal('')),
  notes:  z.string().max(1000).nullable().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'CONVERTED', 'DROPPED']).optional(),
})

// ─── POST /api/admin/campaigns/[id]/leads ────────────────────────────────────

export async function POST(req: Request, { params }: Params) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccess(admin.role, 'campaigns')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = CreateLeadSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { id: true } })
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const data = result.data

  try {
    const lead = await prisma.campaignLead.create({
      data: {
        campaignId: id,
        name:       data.name,
        mobile:     data.mobile,
        email:      data.email || null,
        notes:      data.notes || null,
        status:     data.status ?? 'NEW',
      },
      select: { id: true, name: true, mobile: true, email: true, notes: true, status: true, createdAt: true },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/campaigns/[id]/leads]', error)
    return NextResponse.json({ error: 'Failed to add lead' }, { status: 500 })
  }
}
