import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin/session'
import { canAccessRecipesReels } from '@/lib/admin/recipesReelsAccess'
import { getAdminRecipes, type AdminRecipeListFilters } from '@/lib/admin/recipes'

const VALID_STATUSES: NonNullable<AdminRecipeListFilters['status']>[] = [
  'published', 'unpublished', 'banned', 'trending',
]

// ─── GET /api/admin/recipes ───────────────────────────────────────────────────

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRecipesReels(admin.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const status = statusParam && VALID_STATUSES.includes(statusParam as NonNullable<AdminRecipeListFilters['status']>)
    ? (statusParam as AdminRecipeListFilters['status'])
    : undefined
  const search = searchParams.get('search') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))

  try {
    const result = await getAdminRecipes({ status, search, page, limit })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/admin/recipes]', error)
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
  }
}
