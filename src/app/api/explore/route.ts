import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const CACHE = { headers: { 'Cache-Control': 'private, no-store' } }

// 15 of each type per page for mixed tabs (30 total); 30 for single-type tabs
const PER_TYPE  = 15
const PAGE_SIZE = 30

// Trending tab: top-liked within 15 days, fixed counts, no pagination
const TRENDING_RECIPES = 20
const TRENDING_REELS   = 10

// Recent tab: posted within 15 days, shuffled, no pagination
const RECENT_RECIPES = 30
const RECENT_REELS   = 15

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tab = req.nextUrl.searchParams.get('tab')
  // tab: 'all' | 'trending' | 'recent' | 'recipes' | 'reels' | null (week-based, unused now)

  // ── Trending: most-liked within the past 15 days, shuffled, no pagination ──
  if (tab === 'trending') {
    const since = new Date()
    since.setDate(since.getDate() - 15)

    const [recipes, reels] = await Promise.all([
      prisma.recipe.findMany({
        where: { isPublished: true, createdAt: { gte: since } },
        select: {
          id: true, title: true, coverImage: true,
          cookTime: true, prepTime: true, likeCount: true,
          difficulty: true, description: true, servings: true,
          createdAt: true,
          user: {
            select: {
              id: true, username: true, firstName: true,
              lastName: true, profileImage: true, isVerified: true,
              hideLikeCount: true,
            },
          },
        },
        orderBy: { likeCount: 'desc' },
        take: TRENDING_RECIPES,
      }),
      prisma.reel.findMany({
        where: { isPublished: true, createdAt: { gte: since } },
        select: {
          id: true, title: true, description: true, videoUrl: true, thumbnailUrl: true,
          likeCount: true, viewCount: true, duration: true,
          gradient: true, emoji: true, createdAt: true,
          user: {
            select: {
              id: true, username: true, firstName: true,
              lastName: true, profileImage: true, hideLikeCount: true,
            },
          },
        },
        orderBy: { likeCount: 'desc' },
        take: TRENDING_REELS,
      }),
    ])

    return NextResponse.json({
      recipes: shuffle(recipes).map((r: any) => ({ ...r, likeCount: r.user.hideLikeCount ? null : r.likeCount, createdAt: r.createdAt.toISOString() })),
      reels:   shuffle(reels).map((r: any)   => ({ ...r, likeCount: r.user.hideLikeCount ? null : r.likeCount, createdAt: r.createdAt.toISOString() })),
      hasMore: false,
      page: 0,
    }, CACHE)
  }

  // ── Recent: posted within the past 15 days, shuffled, no pagination ──────────
  if (tab === 'recent') {
    const since = new Date()
    since.setDate(since.getDate() - 15)

    const [recipes, reels] = await Promise.all([
      prisma.recipe.findMany({
        where: { isPublished: true, createdAt: { gte: since } },
        select: {
          id: true, title: true, coverImage: true,
          cookTime: true, prepTime: true, likeCount: true,
          difficulty: true, description: true, servings: true,
          createdAt: true,
          user: {
            select: {
              id: true, username: true, firstName: true,
              lastName: true, profileImage: true, isVerified: true, hideLikeCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_RECIPES,
      }),
      prisma.reel.findMany({
        where: { isPublished: true, createdAt: { gte: since } },
        select: {
          id: true, title: true, description: true, videoUrl: true, thumbnailUrl: true,
          likeCount: true, viewCount: true, duration: true,
          gradient: true, emoji: true, createdAt: true,
          user: {
            select: {
              id: true, username: true, firstName: true,
              lastName: true, profileImage: true, hideLikeCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_REELS,
      }),
    ])

    return NextResponse.json({
      recipes: shuffle(recipes).map((r: any) => ({ ...r, likeCount: r.user.hideLikeCount ? null : r.likeCount, createdAt: r.createdAt.toISOString() })),
      reels:   shuffle(reels).map((r: any)   => ({ ...r, likeCount: r.user.hideLikeCount ? null : r.likeCount, createdAt: r.createdAt.toISOString() })),
      hasMore: false,
      page: 0,
    }, CACHE)
  }

  if (tab === 'all' || tab === 'recipes' || tab === 'reels') {
    const page       = Math.max(0, parseInt(req.nextUrl.searchParams.get('page') ?? '0', 10))
    const isMixed    = tab === 'all'
    const recipeTake = isMixed ? PER_TYPE : PAGE_SIZE
    const reelTake   = isMixed ? PER_TYPE : PAGE_SIZE
    const recipeSkip = page * recipeTake
    const reelSkip   = page * reelTake

    const orderBy = { createdAt: 'desc' as const }

    const [recipes, reels] = await Promise.all([
      tab !== 'reels'
        ? prisma.recipe.findMany({
            where: { isPublished: true },
            select: {
              id: true, title: true, coverImage: true,
              cookTime: true, prepTime: true, likeCount: true,
              difficulty: true, description: true, servings: true,
              createdAt: true,
              user: {
                select: {
                  id: true, username: true, firstName: true,
                  lastName: true, profileImage: true, isVerified: true, hideLikeCount: true,
                },
              },
            },
            orderBy,
            take: recipeTake,
            skip: recipeSkip,
          })
        : Promise.resolve([] as any[]),
      tab !== 'recipes'
        ? prisma.reel.findMany({
            where: { isPublished: true },
            select: {
              id: true, title: true, description: true, videoUrl: true, thumbnailUrl: true,
              likeCount: true, viewCount: true, duration: true,
              gradient: true, emoji: true, createdAt: true,
              user: {
                select: {
                  id: true, username: true, firstName: true,
                  lastName: true, profileImage: true, hideLikeCount: true,
                },
              },
            },
            orderBy,
            take: reelTake,
            skip: reelSkip,
          })
        : Promise.resolve([] as any[]),
    ])

    const hasMore =
      (tab !== 'reels'   && recipes.length === recipeTake) ||
      (tab !== 'recipes' && reels.length   === reelTake)

    const outRecipes = shuffle(recipes)
    const outReels   = shuffle(reels)

    return NextResponse.json({
      recipes: outRecipes.map((r: any) => ({ ...r, likeCount: r.user.hideLikeCount ? null : r.likeCount, createdAt: r.createdAt.toISOString() })),
      reels:   outReels.map((r: any)   => ({ ...r, likeCount: r.user.hideLikeCount ? null : r.likeCount, createdAt: r.createdAt.toISOString() })),
      hasMore,
      page,
    }, CACHE)
  }

  // ── Legacy week-based fallback (kept for safety) ────────────────────────────
  const week = Math.max(0, parseInt(req.nextUrl.searchParams.get('week') ?? '0', 10))
  const now  = new Date()
  const end  = new Date(now)
  end.setDate(end.getDate() - week * 7)
  const start = new Date(end)
  start.setDate(start.getDate() - 7)
  const olderStart = new Date(start)
  olderStart.setDate(olderStart.getDate() - 7)

  const [recipes, reels, olderRecipesCount, olderReelsCount] = await Promise.all([
    prisma.recipe.findMany({
      where: { isPublished: true, createdAt: { gte: start, lt: end } },
      select: {
        id: true, title: true, coverImage: true,
        cookTime: true, prepTime: true, likeCount: true,
        difficulty: true, description: true, servings: true, createdAt: true,
        user: { select: { id: true, username: true, firstName: true, lastName: true, profileImage: true, isVerified: true, hideLikeCount: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.reel.findMany({
      where: { isPublished: true, createdAt: { gte: start, lt: end } },
      select: {
        id: true, title: true, description: true, videoUrl: true, thumbnailUrl: true,
        likeCount: true, viewCount: true, duration: true,
        gradient: true, emoji: true, createdAt: true,
        user: { select: { id: true, username: true, firstName: true, lastName: true, profileImage: true, hideLikeCount: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.recipe.count({ where: { isPublished: true, createdAt: { gte: olderStart, lt: start } } }),
    prisma.reel.count({ where: { isPublished: true, createdAt: { gte: olderStart, lt: start } } }),
  ])

  return NextResponse.json({
    recipes: shuffle(recipes).map(r => ({ ...r, likeCount: (r as any).user.hideLikeCount ? null : r.likeCount, createdAt: r.createdAt.toISOString() })),
    reels:   shuffle(reels).map(r   => ({ ...r, likeCount: (r as any).user.hideLikeCount ? null : r.likeCount, createdAt: r.createdAt.toISOString() })),
    week, startDate: start.toISOString(), endDate: end.toISOString(),
    hasOlder: olderRecipesCount + olderReelsCount > 0,
  }, CACHE)
}
