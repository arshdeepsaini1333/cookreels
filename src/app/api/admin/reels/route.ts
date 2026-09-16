import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin/session'
import { canAccessRecipesReels } from '@/lib/admin/recipesReelsAccess'
import { getAdminReels, type AdminReelListFilters } from '@/lib/admin/reels'

const VALID_STATUSES: NonNullable<AdminReelListFilters['status']>[] = [
  'published', 'unpublished', 'banned', 'trending',
]

// ─── GET /api/admin/reels ─────────────────────────────────────────────────────

export async function GET(req: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessRecipesReels(admin.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')
  const status = statusParam && VALID_STATUSES.includes(statusParam as NonNullable<AdminReelListFilters['status']>)
    ? (statusParam as AdminReelListFilters['status'])
    : undefined
  const search = searchParams.get('search') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))

  try {
    const result = await getAdminReels({ status, search, page, limit })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/admin/reels]', error)
    return NextResponse.json({ error: 'Failed to fetch reels' }, { status: 500 })
  }
}
