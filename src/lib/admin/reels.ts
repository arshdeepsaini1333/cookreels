import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma'

// ─── List ─────────────────────────────────────────────────────────────────────

export type AdminReelListFilters = {
  status?: 'published' | 'unpublished' | 'banned' | 'trending'
  search?: string
  page?: number
  limit?: number
}

export type AdminReelListItem = {
  id: string
  title: string
  thumbnailUrl: string | null
  duration: number | null
  isPublished: boolean
  isTrending: boolean
  isBanned: boolean
  likeCount: number
  viewCount: number
  commentCount: number
  createdAt: Date
  author: { id: string; username: string; email: string }
}

export async function getAdminReels(filters: AdminReelListFilters) {
  const page = Math.max(1, filters.page ?? 1)
  const limit = Math.min(50, Math.max(1, filters.limit ?? 20))
  const skip = (page - 1) * limit

  const where: Prisma.ReelWhereInput = {
    ...(filters.status === 'published' ? { isPublished: true } : {}),
    ...(filters.status === 'unpublished' ? { isPublished: false } : {}),
    ...(filters.status === 'banned' ? { isBanned: true } : {}),
    ...(filters.status === 'trending' ? { isTrending: true } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { user: { username: { contains: filters.search, mode: 'insensitive' } } },
            { user: { email: { contains: filters.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const [reels, total] = await Promise.all([
    prisma.reel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        isPublished: true,
        isTrending: true,
        isBanned: true,
        likeCount: true,
        viewCount: true,
        commentCount: true,
        createdAt: true,
        user: { select: { id: true, username: true, email: true } },
      },
    }),
    prisma.reel.count({ where }),
  ])

  const items: AdminReelListItem[] = reels.map(r => ({
    id: r.id,
    title: r.title,
    thumbnailUrl: r.thumbnailUrl,
    duration: r.duration,
    isPublished: r.isPublished,
    isTrending: r.isTrending,
    isBanned: r.isBanned,
    likeCount: r.likeCount,
    viewCount: r.viewCount,
    commentCount: r.commentCount,
    createdAt: r.createdAt,
    author: r.user,
  }))

  return { items, total, page, limit }
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function getAdminReelById(id: string) {
  const reel = await prisma.reel.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, email: true, firstName: true, lastName: true, profileImage: true } },
      categories: { include: { category: { select: { id: true, name: true, slug: true, emoji: true, group: true } } } },
    },
  })
  if (!reel) return null

  return {
    id: reel.id,
    title: reel.title,
    description: reel.description,
    videoUrl: reel.videoUrl,
    thumbnailUrl: reel.thumbnailUrl,
    duration: reel.duration,
    gradient: reel.gradient,
    emoji: reel.emoji,
    likeCount: reel.likeCount,
    commentCount: reel.commentCount,
    viewCount: reel.viewCount,
    savedCount: reel.savedCount,
    isPublished: reel.isPublished,
    isTrending: reel.isTrending,
    isBanned: reel.isBanned,
    bannedAt: reel.bannedAt,
    createdAt: reel.createdAt,
    updatedAt: reel.updatedAt,
    author: {
      id: reel.user.id,
      username: reel.user.username,
      email: reel.user.email,
      name: `${reel.user.firstName} ${reel.user.lastName}`.trim(),
      profileImage: reel.user.profileImage,
    },
    categories: reel.categories.map(c => c.category),
  }
}

export type AdminReelDetail = NonNullable<Awaited<ReturnType<typeof getAdminReelById>>>
