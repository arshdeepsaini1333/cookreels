import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'
import type { Audience, AudienceLocation } from '@/types/campaign'

// ─── Validation ───────────────────────────────────────────────────────────────

const LocationSchema = z.object({
  type:  z.enum(['country', 'state', 'city', 'district', 'pincode']),
  value: z.string().min(1).max(100),
})

const AudienceSchema = z.object({
  name:       z.string().min(1, 'Audience name is required').max(60, 'Audience name must be 60 characters or fewer'),
  gender:     z.enum(['all', 'male', 'female']),
  ageMin:     z.number().int().min(18).max(65),
  ageMax:     z.number().int().min(18).max(65),
  locations:  z.array(LocationSchema).min(1, 'At least one location is required'),
  interests:  z.array(z.string().max(60)).max(50).optional().default([]),
  behaviours: z.array(z.string().max(60)).max(50).optional().default([]),
  deviceType: z.enum(['all', 'mobile', 'desktop', 'tablet']).optional().default('all'),
  os:         z.enum(['all', 'android', 'ios', 'windows', 'macos', 'linux']).optional().default('all'),
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

// ─── GET /api/audiences ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

  try {
    const audiences = await prisma.audience.findMany({
      where: {
        userId: session.userId,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ audiences: audiences.map(serialize) })
  } catch (error) {
    console.error('[GET /api/audiences]', error)
    return NextResponse.json({ error: 'Failed to fetch audiences' }, { status: 500 })
  }
}

// ─── POST /api/audiences ───────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = AudienceSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const data = result.data
  if (data.ageMax < data.ageMin) {
    return NextResponse.json({ error: 'Maximum age must be greater than or equal to minimum age' }, { status: 400 })
  }

  try {
    const audience = await prisma.audience.create({
      data: {
        userId:     session.userId,
        name:       data.name,
        gender:     data.gender,
        ageMin:     data.ageMin,
        ageMax:     data.ageMax,
        locations:  data.locations as Prisma.InputJsonValue,
        interests:  data.interests,
        behaviours: data.behaviours,
        deviceType: data.deviceType,
        os:         data.os,
      },
    })
    return NextResponse.json(serialize(audience), { status: 201 })
  } catch (error) {
    console.error('[POST /api/audiences]', error)
    return NextResponse.json({ error: 'Failed to create audience' }, { status: 500 })
  }
}
