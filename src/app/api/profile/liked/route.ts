import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.userId

  const [likedRecipes, likedReels] = await Promise.all([
    prisma.recipeLike.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        recipe: {
          select: {
            id:         true,
            title:      true,
            coverImage: true,
            cookTime:   true,
            prepTime:   true,
            likeCount:  true,
            difficulty: true,
            isPublished: true,
          },
        },
      },
    }),
    prisma.reelLike.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        reel: {
          select: {
            id:           true,
            title:        true,
            thumbnailUrl: true,
            videoUrl:     true,
            likeCount:    true,
            duration:     true,
            viewCount:    true,
            isPublished:  true,
          },
        },
      },
    }),
  ])

  return NextResponse.json({
    recipes: likedRecipes
      .filter(l => l.recipe.isPublished)
      .map(l => ({
        id:         l.recipe.id,
        title:      l.recipe.title,
        coverImage: l.recipe.coverImage,
        cookTime:   l.recipe.cookTime,
        prepTime:   l.recipe.prepTime,
        likeCount:  l.recipe.likeCount,
        difficulty: l.recipe.difficulty as string | null,
      })),
    reels: likedReels
      .filter(l => l.reel.isPublished)
      .map(l => ({
        id:           l.reel.id,
        title:        l.reel.title,
        thumbnailUrl: l.reel.thumbnailUrl,
        videoUrl:     l.reel.videoUrl,
        likeCount:    l.reel.likeCount,
        duration:     l.reel.duration,
        viewCount:    l.reel.viewCount,
      })),
  })
}
