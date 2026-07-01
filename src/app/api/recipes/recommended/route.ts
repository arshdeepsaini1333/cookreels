import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const CACHE_HEADERS = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recipes = await prisma.recipe.findMany({
    where: {
      isPublished: true,
      isBanned: false,
      user: { privateAccount: false, isBanned: false },
      NOT: { reports: { some: { reporterId: session.userId } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      cookTime: true,
      prepTime: true,
      servings: true,
      createdAt: true,
      avgRating: true,
      likeCount: true,
      cuisine: true,
      difficulty: true,
      isVeg: true,
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          isVerified: true,
        },
      },
    },
  })

  return NextResponse.json({ recipes }, { headers: CACHE_HEADERS })
}
