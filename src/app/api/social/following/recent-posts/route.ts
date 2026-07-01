import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const uid = session.userId

    const followingWithActivity = await prisma.follow.findMany({
      where: { followerId: uid },
      select: {
        following: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            reels: {
              where: {
                isPublished: true,
                isBanned: false,
                NOT: { reports: { some: { reporterId: uid } } },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, title: true, createdAt: true },
            },
            recipes: {
              where: {
                isPublished: true,
                isBanned: false,
                NOT: { reports: { some: { reporterId: uid } } },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, title: true, createdAt: true },
            },
          },
        },
      },
    })

    type ActivityEntry = {
      id: string
      username: string
      displayName: string
      profileImage: string | null
      recentPostTitle: string
      recentPostType: 'reel' | 'recipe'
      postedAt: string
    }

    const withActivity: ActivityEntry[] = []

    for (const { following: user } of followingWithActivity) {
      const latestReel   = user.reels[0]   ?? null
      const latestRecipe = user.recipes[0] ?? null

      if (!latestReel && !latestRecipe) continue

      let title: string
      let type: 'reel' | 'recipe'
      let postedAt: Date

      if (latestReel && latestRecipe) {
        if (latestReel.createdAt >= latestRecipe.createdAt) {
          title = latestReel.title; type = 'reel'; postedAt = latestReel.createdAt
        } else {
          title = latestRecipe.title; type = 'recipe'; postedAt = latestRecipe.createdAt
        }
      } else if (latestReel) {
        title = latestReel.title; type = 'reel'; postedAt = latestReel.createdAt
      } else {
        title = latestRecipe!.title; type = 'recipe'; postedAt = latestRecipe!.createdAt
      }

      withActivity.push({
        id: user.id,
        username: user.username,
        displayName: `${user.firstName} ${user.lastName}`.trim() || user.username,
        profileImage: user.profileImage,
        recentPostTitle: title,
        recentPostType: type,
        postedAt: postedAt.toISOString(),
      })
    }

    withActivity.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())

    return NextResponse.json({ friends: withActivity.slice(0, 3) })
  } catch (error) {
    console.error('[following/recent-posts GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
