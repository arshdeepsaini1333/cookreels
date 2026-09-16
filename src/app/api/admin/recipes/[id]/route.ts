import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin/session'
import { canAccessRecipesReels } from '@/lib/admin/recipesReelsAccess'
import { getAdminRecipeById } from '@/lib/admin/recipes'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'

type Params = { params: Promise<{ id: string }> }

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const

const UpdateRecipeSchema = z.object({
  title:        z.string().min(1).max(200).optional(),
  description:  z.string().nullable().optional(),
  coverImage:   z.string().nullable().optional(),
  cuisine:      z.string().nullable().optional(),
  cookTime:     z.number().int().positive().nullable().optional(),
  prepTime:     z.number().int().positive().nullable().optional(),
  servings:     z.number().int().positive().nullable().optional(),
  calories:     z.number().int().positive().nullable().optional(),
  difficulty:   z.enum(DIFFICULTIES).nullable().optional(),
  isVeg:        z.boolean().optional(),
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

// ─── GET /api/admin/recipes/[id] ─────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  const access = await requireAccess()
  if (access.error) return access.error

  const { id } = await params

  try {
    const recipe = await getAdminRecipeById(id)
    if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    return NextResponse.json(recipe)
  } catch (error) {
    console.error('[GET /api/admin/recipes/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 })
  }
}

// ─── PATCH /api/admin/recipes/[id] ───────────────────────────────────────────

export async function PATCH(req: Request, { params }: Params) {
  const access = await requireAccess()
  if (access.error) return access.error

  const { id } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = UpdateRecipeSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
  }

  const existing = await prisma.recipe.findUnique({ where: { id }, select: { id: true, isBanned: true } })
  if (!existing) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })

  const data = result.data

  const updateData: Prisma.RecipeUpdateInput = {}
  if (data.title        !== undefined) updateData.title        = data.title
  if (data.description  !== undefined) updateData.description  = data.description
  if (data.coverImage   !== undefined) updateData.coverImage   = data.coverImage
  if (data.cuisine      !== undefined) updateData.cuisine      = data.cuisine
  if (data.cookTime      !== undefined) updateData.cookTime    = data.cookTime
  if (data.prepTime      !== undefined) updateData.prepTime    = data.prepTime
  if (data.servings      !== undefined) updateData.servings    = data.servings
  if (data.calories      !== undefined) updateData.calories    = data.calories
  if (data.difficulty    !== undefined) updateData.difficulty  = data.difficulty
  if (data.isVeg         !== undefined) updateData.isVeg       = data.isVeg
  if (data.isPublished   !== undefined) updateData.isPublished = data.isPublished
  if (data.isTrending    !== undefined) updateData.isTrending  = data.isTrending
  if (data.isBanned      !== undefined) {
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
    const updated = await prisma.recipe.update({
      where: { id },
      data: updateData,
      select: { id: true, updatedAt: true },
    })
    return NextResponse.json({ id: updated.id, updatedAt: updated.updatedAt.toISOString() })
  } catch (error) {
    console.error('[PATCH /api/admin/recipes/[id]]', error)
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 })
  }
}

// ─── DELETE /api/admin/recipes/[id] ──────────────────────────────────────────

export async function DELETE(_req: Request, { params }: Params) {
  const access = await requireAccess()
  if (access.error) return access.error

  const { id } = await params

  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { id: true } })
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })

  try {
    await prisma.recipe.delete({ where: { id } })
    return NextResponse.json({ message: 'Recipe deleted' })
  } catch (error) {
    console.error('[DELETE /api/admin/recipes/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 })
  }
}
