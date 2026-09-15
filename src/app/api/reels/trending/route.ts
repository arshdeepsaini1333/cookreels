import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'
import { blockedAuthorFilter } from '@/lib/blocks'

const CACHE_HEADERS = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  // Public read — trending reels are visible to guests too. '' is a safe
  // sentinel for a logged-out viewer: it can never match a real user id, so
  // the report/block exclusions below just become no-ops.
  const session = await getSession()
  const userId = session?.userId ?? ''

  const reels = await prisma.reel.findMany({
    where: {
      isPublished: true,
      isBanned: false,
      user: { privateAccount: false, isBanned: false },
      NOT: [
        { reports: { some: { reporterId: userId } } },
        blockedAuthorFilter<Prisma.ReelWhereInput>(userId),
      ],
    },
    select: {
      id: true,
      title: true,
      likeCount: true,
      commentCount: true,
      viewCount: true,
      duration: true,
      thumbnailUrl: true,
      videoUrl: true,
      gradient: true,
      user: { select: { id: true, username: true, firstName: true, lastName: true, profileImage: true, isVerified: true } },
    },
  })

  const top = reels
    .map(r => ({ ...r, trendingScore: r.likeCount + 2 * r.commentCount }))
    .sort((a, b) => b.trendingScore - a.trendingScore)
    .slice(0, 10)

  return NextResponse.json({ reels: top }, { headers: CACHE_HEADERS })
}
