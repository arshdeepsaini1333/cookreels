import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const CACHE = { headers: { 'Cache-Control': 'private, no-store' } }

const USER_LIMIT   = 6
const RECIPE_LIMIT = 8
const REEL_LIMIT   = 8

// Global header search: matches users by name/username, published recipes by title,
// and published reels by title.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (!q) return NextResponse.json({ users: [], recipes: [], reels: [] }, CACHE)

  const [users, recipes, reels] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { not: session.userId },
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
      take: USER_LIMIT,
    }),
    prisma.recipe.findMany({
      where: {
        isPublished: true,
        title: { contains: q, mode: 'insensitive' },
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
      take: RECIPE_LIMIT,
    }),
    prisma.reel.findMany({
      where: {
        isPublished: true,
        title: { contains: q, mode: 'insensitive' },
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
      take: REEL_LIMIT,
    }),
  ])

  return NextResponse.json({
    users,
    recipes: recipes.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
    reels: reels.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
  }, CACHE)
}
