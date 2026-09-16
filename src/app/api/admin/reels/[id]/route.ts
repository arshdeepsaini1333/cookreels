import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin/session'
import { canAccessRecipesReels } from '@/lib/admin/recipesReelsAccess'
import { getAdminReelById } from '@/lib/admin/reels'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'

type Params = { params: Promise<{ id: string }> }

const UpdateReelSchema = z.object({
  title:        z.string().min(1).max(200).optional(),
  description:  z.string().nullable().optional(),
  videoUrl:     z.string().min(1).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  duration:     z.number().int().positive().nullable().optional(),
  gradient:     z.string().nullable().optional(),
  emoji:        z.string().nullable().optional(),
  categoryIds:  z.array(z.string()).optional(),
  isPublished:  z.boolean().optional(),
  isTrending:   z.boolean().optional(),
  isBanned:     z.boolean().optional(),
})

async function requireAccess() {
  const admin = await getAdminSession()
  if (!admin) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!canAccessRecipesReels(admin.email)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { admin }
}

// ─── GET /api/admin/reels/[id] ───────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  const access = await requireAccess()
  if (access.error) return access.error

  const { id } = await params

  try {
    const reel = await getAdminReelById(id)
    if (!reel) return NextResponse.json({ error: 'Reel not found' }, { status: 404 })
    return NextResponse.json(reel)
  } catch (error) {
    console.error('[GET /api/admin/reels/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch reel' }, { status: 500 })
  }
}

// ─── PATCH /api/admin/reels/[id] ─────────────────────────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  const access = await requireAccess()
  if (access.error) return access.error

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = UpdateReelSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const existing = await prisma.reel.findUnique({ where: { id }, select: { id: true, isBanned: true } })
  if (!existing) return NextResponse.json({ error: 'Reel not found' }, { status: 404 })

  const data = result.data

  const updateData: Prisma.ReelUpdateInput = {}
  if (data.title        !== undefined) updateData.title        = data.title
  if (data.description  !== undefined) updateData.description  = data.description
  if (data.videoUrl     !== undefined) updateData.videoUrl     = data.videoUrl
  if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl
  if (data.duration     !== undefined) updateData.duration     = data.duration
  if (data.gradient     !== undefined) updateData.gradient     = data.gradient
  if (data.emoji        !== undefined) updateData.emoji        = data.emoji
  if (data.isPublished  !== undefined) updateData.isPublished  = data.isPublished
  if (data.isTrending   !== undefined) updateData.isTrending   = data.isTrending
  if (data.isBanned     !== undefined) {
    updateData.isBanned = data.isBanned
    if (data.isBanned && !existing.isBanned) updateData.bannedAt = new Date()
    if (!data.isBanned && existing.isBanned) updateData.bannedAt = null
  }
  if (data.categoryIds !== undefined) {
    updateData.categories = {
      deleteMany: {},
      create: data.categoryIds.map(categoryId => ({ categoryId })),
    }
  }

  try {
    const updated = await prisma.reel.update({
      where: { id },
      data: updateData,
      select: { id: true, updatedAt: true },
    })
    return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt.toISOString() })
  } catch (error) {
    console.error('[PATCH /api/admin/reels/[id]]', error)
    return NextResponse.json({ error: 'Failed to update reel' }, { status: 500 })
  }
}

// ─── DELETE /api/admin/reels/[id] ────────────────────────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  const access = await requireAccess()
  if (access.error) return access.error

  const { id } = await params

  const reel = await prisma.reel.findUnique({ where: { id }, select: { id: true } })
  if (!reel) return NextResponse.json({ error: 'Reel not found' }, { status: 404 })

  try {
    await prisma.reel.delete({ where: { id } })
    return NextResponse.json({ message: 'Reel deleted' })
  } catch (error) {
    console.error('[DELETE /api/admin/reels/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete reel' }, { status: 500 })
  }
}
