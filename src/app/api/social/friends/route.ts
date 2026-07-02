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

    // Friends = users I follow AND who follow me back (mutual follows)
    const searchFilter = search ? {
      OR: [
        { username:  { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName:  { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}

    const where = {
      AND: [
        { followers: { some: { followerId:  userId } } }, // I follow them
        { following: { some: { followingId: userId } } }, // they follow me
        ...(search ? [searchFilter] : []),
      ],
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, username: true,
          profileImage: true, bio: true, cuisineSpecialty: true,
          level: true, isVerified: true,
          _count: { select: { followers: true, following: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users: users.map(u => ({
        id: u.id, firstName: u.firstName, lastName: u.lastName,
        username: u.username, profileImage: u.profileImage, bio: u.bio,
        cuisineSpecialty: u.cuisineSpecialty, level: u.level,
        isVerified: u.isVerified,
        followersCount: u._count.followers, followingCount: u._count.following,
        isFollowing: true, isFollowedBy: true, isFriend: true,
      })),
      total, page, totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[friends GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
