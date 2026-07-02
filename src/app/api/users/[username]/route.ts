import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type Params = { params: Promise<{ username: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { username } = await params
    const session = await getSession()

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        bio: true,
        profileImage: true,
        cuisineSpecialty: true,
        level: true,
        isVerified: true,
        _count: {
          select: {
            recipes:   { where: { isPublished: true } },
            reels:     { where: { isPublished: true } },
            followers: true,
            following: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Friends count (mutual follows)
    const friendsCount = await prisma.user.count({
      where: {
        AND: [
          { followers: { some: { followerId:  user.id } } },
          { following: { some: { followingId: user.id } } },
        ],
      },
    })

    // Follow relationship if viewer is logged in
    let isFollowing  = false
    let isFollowedBy = false

    if (session && session.userId !== user.id) {
      const [fwd, rev] = await Promise.all([
        prisma.follow.findFirst({
          where: { followerId: session.userId, followingId: user.id },
          select: { id: true },
        }),
        prisma.follow.findFirst({
          where: { followerId: user.id, followingId: session.userId },
          select: { id: true },
        }),
      ])
      isFollowing  = !!fwd
      isFollowedBy = !!rev
    }

    return NextResponse.json({
      id:               user.id,
      firstName:        user.firstName,
      lastName:         user.lastName,
      username:         user.username,
      bio:              user.bio,
      profileImage:     user.profileImage,
      cuisineSpecialty: user.cuisineSpecialty,
      level:            user.level,
      isVerified:       user.isVerified,
      recipesCount:     user._count.recipes,
      reelsCount:       user._count.reels,
      followersCount:   user._count.followers,
      followingCount:   user._count.following,
      friendsCount,
      isFollowing,
      isFollowedBy,
      isFriend: isFollowing && isFollowedBy,
    })
  } catch (error) {
    console.error('[users/[username] GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
