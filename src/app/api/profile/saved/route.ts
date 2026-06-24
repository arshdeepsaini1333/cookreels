import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.userId

  const [savedRecipes, savedReels] = await Promise.all([
    prisma.savedRecipe.findMany({
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
    prisma.savedReel.findMany({
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
    recipes: savedRecipes
      .filter(s => s.recipe.isPublished)
      .map(s => ({
        id:         s.recipe.id,
        title:      s.recipe.title,
        coverImage: s.recipe.coverImage,
        cookTime:   s.recipe.cookTime,
        prepTime:   s.recipe.prepTime,
        likeCount:  s.recipe.likeCount,
        difficulty: s.recipe.difficulty as string | null,
      })),
    reels: savedReels
      .filter(s => s.reel.isPublished)
      .map(s => ({
        id:           s.reel.id,
        title:        s.reel.title,
        thumbnailUrl: s.reel.thumbnailUrl,
        videoUrl:     s.reel.videoUrl,
        likeCount:    s.reel.likeCount,
        duration:     s.reel.duration,
        viewCount:    s.reel.viewCount,
      })),
  })
}
