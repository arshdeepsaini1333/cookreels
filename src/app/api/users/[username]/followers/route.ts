import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Params = { params: Promise<{ username: string }> }

export async function GET(req: Request, { params }: Params) {
  try {
    const { username } = await params
    const session = await getSession()

    const profileUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })
    if (!profileUser) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const page   = Math.max(1, Number(searchParams.get('page')  ?? '1'))
    const limit  = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')))
    const search = (searchParams.get('search') ?? '').trim()

    const viewerId = session?.userId ?? ''

    // Users who follow profileUser
    const followerRecords = await prisma.follow.findMany({
      where: { followingId: profileUser.id },
      select: { followerId: true },
    })
    const followerIds = followerRecords.map(r => r.followerId)

    const searchFilter = search ? {
      OR: [
        { username:  { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName:  { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}

    const where = {
      id: { in: followerIds },
      ...(search ? searchFilter : {}),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, firstName: true, lastName: true, username: true,
          profileImage: true, bio: true, cuisineSpecialty: true,
          level: true, isVerified: true,
          followers: { where: { followerId: viewerId }, select: { id: true } },
          following: { where: { followingId: viewerId }, select: { id: true } },
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
          isVerified: u.isVerified,
          followersCount: u._count.followers, followingCount: u._count.following,
          isFollowing, isFollowedBy, isFriend: isFollowing && isFollowedBy,
        }
      }),
      total, page, totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[users/[username]/followers GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
