import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, Number(searchParams.get('page')  ?? '1'))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')))
    const search = (searchParams.get('search') ?? '').trim()

    const userId = session.userId

    const searchFilter = search ? {
      OR: [
        { username:  { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName:  { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}

    const where = {
      id: { not: userId },
      // Only show users the current user is NOT yet following
      NOT: { followers: { some: { followerId: userId } } },
      ...(search ? searchFilter : {}),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, username: true,
          profileImage: true, bio: true, cuisineSpecialty: true,
          level: true, isVerified: true, isOnline: true,
          // Do I follow them?
          followers: { where: { followerId: userId }, select: { id: true } },
          // Do they follow me?
          following: { where: { followingId: userId }, select: { id: true } },
          _count: { select: { followers: true, following: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users: users.map(u => {
        const isFollowing  = u.followers.length > 0
        const isFollowedBy = u.following.length > 0
        return {
          id: u.id, firstName: u.firstName, lastName: u.lastName,
          username: u.username, profileImage: u.profileImage, bio: u.bio,
          cuisineSpecialty: u.cuisineSpecialty, level: u.level,
          isVerified: u.isVerified, isOnline: u.isOnline,
          followersCount: u._count.followers, followingCount: u._count.following,
          isFollowing, isFollowedBy, isFriend: isFollowing && isFollowedBy,
        }
      }),
      total, page, totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[users GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
