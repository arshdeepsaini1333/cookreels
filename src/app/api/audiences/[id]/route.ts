import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'
import type { Audience, AudienceLocation } from '@/types/campaign'

type Params = { params: Promise<{ id: string }> }

const LocationSchema = z.object({
  type:  z.enum(['country', 'state', 'city', 'district', 'pincode']),
  value: z.string().min(1).max(100),
})

const UpdateAudienceSchema = z.object({
  name:       z.string().min(1).max(60).optional(),
  gender:     z.enum(['all', 'male', 'female']).optional(),
  ageMin:     z.number().int().min(18).max(65).optional(),
  ageMax:     z.number().int().min(18).max(65).optional(),
  locations:  z.array(LocationSchema).min(1, 'At least one location is required').optional(),
  interests:  z.array(z.string().max(60)).max(50).optional(),
  behaviours: z.array(z.string().max(60)).max(50).optional(),
  deviceType: z.enum(['all', 'mobile', 'desktop', 'tablet']).optional(),
  os:         z.enum(['all', 'android', 'ios', 'windows', 'macos', 'linux']).optional(),
})

type AudienceRow = {
  id: string; name: string; gender: string; ageMin: number; ageMax: number
  locations: Prisma.JsonValue; interests: string[]; behaviours: string[]
  deviceType: string; os: string; createdAt: Date; updatedAt: Date
}

function serialize(a: AudienceRow): Audience {
  return {
    id:         a.id,
    name:       a.name,
    gender:     a.gender as Audience['gender'],
    ageMin:     a.ageMin,
    ageMax:     a.ageMax,
    locations:  (a.locations as AudienceLocation[] | null) ?? [],
    interests:  a.interests,
    behaviours: a.behaviours,
    deviceType: a.deviceType as Audience['deviceType'],
    os:         a.os as Audience['os'],
    createdAt:  a.createdAt.toISOString(),
    updatedAt:  a.updatedAt.toISOString(),
  }
}

// ─── GET /api/audiences/[id] ───────────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const audience = await prisma.audience.findFirst({ where: { id, userId: session.userId } })
    if (!audience) return NextResponse.json({ error: 'Audience not found' }, { status: 404 })
    return NextResponse.json(serialize(audience))
  } catch (error) {
    console.error('[GET /api/audiences/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch audience' }, { status: 500 })
  }
}

// ─── PATCH /api/audiences/[id] ─────────────────────────────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = UpdateAudienceSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const existing = await prisma.audience.findFirst({ where: { id, userId: session.userId }, select: { id: true, ageMin: true, ageMax: true } })
  if (!existing) return NextResponse.json({ error: 'Audience not found' }, { status: 404 })

  const data = result.data
  const nextAgeMin = data.ageMin ?? existing.ageMin
  const nextAgeMax = data.ageMax ?? existing.ageMax
  if (nextAgeMax < nextAgeMin) {
    return NextResponse.json({ error: 'Maximum age must be greater than or equal to minimum age' }, { status: 400 })
  }

  const updateData: Prisma.AudienceUpdateInput = {}
  if (data.name       !== undefined) updateData.name       = data.name
  if (data.gender     !== undefined) updateData.gender     = data.gender
  if (data.ageMin     !== undefined) updateData.ageMin     = data.ageMin
  if (data.ageMax     !== undefined) updateData.ageMax     = data.ageMax
  if (data.locations  !== undefined) updateData.locations  = data.locations as Prisma.InputJsonValue
  if (data.interests  !== undefined) updateData.interests  = data.interests
  if (data.behaviours !== undefined) updateData.behaviours = data.behaviours
  if (data.deviceType !== undefined) updateData.deviceType = data.deviceType
  if (data.os         !== undefined) updateData.os         = data.os

  try {
    const audience = await prisma.audience.update({ where: { id }, data: updateData })
    return NextResponse.json(serialize(audience))
  } catch (error) {
    console.error('[PATCH /api/audiences/[id]]', error)
    return NextResponse.json({ error: 'Failed to update audience' }, { status: 500 })
  }
}

// ─── DELETE /api/audiences/[id] ────────────────────────────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.audience.findFirst({ where: { id, userId: session.userId }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Audience not found' }, { status: 404 })

  try {
    await prisma.audience.delete({ where: { id } })
    return NextResponse.json({ message: 'Audience deleted' })
  } catch (error) {
    console.error('[DELETE /api/audiences/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete audience' }, { status: 500 })
  }
}
