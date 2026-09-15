import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'
import { blockedAuthorFilter } from '@/lib/blocks'

const CACHE_HEADERS = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  // Public read — recommended recipes are visible to guests too. '' is a safe
  // sentinel for a logged-out viewer: it can never match a real user id, so
  // the report/block exclusions below just become no-ops.
  const session = await getSession()
  const userId = session?.userId ?? ''

  const recipes = await prisma.recipe.findMany({
    where: {
      isPublished: true,
      isBanned: false,
      user: { privateAccount: false, isBanned: false },
      NOT: [
        { reports: { some: { reporterId: userId } } },
        blockedAuthorFilter<Prisma.RecipeWhereInput>(userId),
      ],
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
