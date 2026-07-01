import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'
import { blockedAuthorFilter, blockedUserFilter } from '@/lib/blocks'

const CACHE = { headers: { 'Cache-Control': 'private, no-store' } }

// How many rows to pull from the DB before ranking — generous so a relevant
// match further down the alphabet never gets cut off before ranking runs.
const USER_FETCH   = 60
const RECIPE_FETCH = 60
const REEL_FETCH   = 60

// How many ranked results to actually return to the dropdown.
const USER_LIMIT   = 10
const RECIPE_LIMIT = 10
const REEL_LIMIT   = 10

// Ranks a candidate string field against the query: exact match first, then
// prefix match, then any other substring match (the fallback bucket, since
// every candidate here already passed a `contains` filter at the DB level).
function matchRank(value: string, q: string): number {
  const v = value.toLowerCase()
  if (v === q) return 0
  if (v.startsWith(q)) return 1
  return 2
}

// Global header search: matches users by name/username, published recipes by title,
// and published reels by title.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (!q) return NextResponse.json({ users: [], recipes: [], reels: [] }, CACHE)

  const uid = session.userId

  const [users, recipes, reels] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { not: uid },
        isBanned: false,
        NOT: [
          { reportsReceived: { some: { reporterId: uid } } },
          blockedUserFilter(uid),
        ],
        OR: [
          { username:  { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName:  { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, username: true, firstName: true, lastName: true,
        profileImage: true, isVerified: true,
      },
      orderBy: { username: 'asc' },
      take: USER_FETCH,
    }),
    prisma.recipe.findMany({
      where: {
        isPublished: true,
        isBanned: false,
        user: { isBanned: false },
        NOT: [
          { reports: { some: { reporterId: uid } } },
          blockedAuthorFilter<Prisma.RecipeWhereInput>(uid),
        ],
        title: { contains: q, mode: 'insensitive' },
        OR: [
          { userId: uid },
          { user: { privateAccount: false } },
          { user: { followers: { some: { followerId: uid, status: 'ACCEPTED' } } } },
        ],
      },
      select: {
        id: true, title: true, coverImage: true,
        cookTime: true, prepTime: true, likeCount: true,
        difficulty: true, description: true, servings: true,
        createdAt: true,
        user: {
          select: {
            id: true, username: true, firstName: true,
            lastName: true, profileImage: true, isVerified: true,
          },
        },
      },
      orderBy: { likeCount: 'desc' },
      take: RECIPE_FETCH,
    }),
    prisma.reel.findMany({
      where: {
        isPublished: true,
        isBanned: false,
        user: { isBanned: false },
        NOT: [
          { reports: { some: { reporterId: uid } } },
          blockedAuthorFilter<Prisma.ReelWhereInput>(uid),
        ],
        title: { contains: q, mode: 'insensitive' },
        OR: [
          { userId: uid },
          { user: { privateAccount: false } },
          { user: { followers: { some: { followerId: uid, status: 'ACCEPTED' } } } },
        ],
      },
      select: {
        id: true, title: true, description: true, videoUrl: true,
        thumbnailUrl: true, duration: true, viewCount: true, likeCount: true,
        gradient: true, emoji: true, createdAt: true,
        user: {
          select: {
            id: true, username: true, firstName: true,
            lastName: true, profileImage: true, isVerified: true,
          },
        },
      },
      orderBy: { likeCount: 'desc' },
      take: REEL_FETCH,
    }),
  ])

  // Rank by relevance (exact > prefix > substring match) before applying the
  // display limit — otherwise a plain alphabetical/popularity order can push
  // a genuinely relevant match past the cutoff and make it seem unsearchable.
  const qLower = q.toLowerCase()

  const rankedUsers = [...users]
    .sort((a, b) => {
      const ra = Math.min(matchRank(a.username, qLower), matchRank(a.firstName, qLower), matchRank(a.lastName, qLower))
      const rb = Math.min(matchRank(b.username, qLower), matchRank(b.firstName, qLower), matchRank(b.lastName, qLower))
      return ra !== rb ? ra - rb : a.username.localeCompare(b.username)
    })
    .slice(0, USER_LIMIT)

  const rankedRecipes = [...recipes]
    .sort((a, b) => {
      const ra = matchRank(a.title, qLower)
      const rb = matchRank(b.title, qLower)
      return ra !== rb ? ra - rb : b.likeCount - a.likeCount
    })
    .slice(0, RECIPE_LIMIT)

  const rankedReels = [...reels]
    .sort((a, b) => {
      const ra = matchRank(a.title, qLower)
      const rb = matchRank(b.title, qLower)
      return ra !== rb ? ra - rb : b.likeCount - a.likeCount
    })
    .slice(0, REEL_LIMIT)

  return NextResponse.json({
    users: rankedUsers,
    recipes: rankedRecipes.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
    reels: rankedReels.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
  }, CACHE)
}
