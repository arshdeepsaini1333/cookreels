import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const session = await getSession()

    const reel = await prisma.reel.findUnique({
      where: { id, isPublished: true },
      select: {
        id:           true,
        title:        true,
        description:  true,
        videoUrl:     true,
        thumbnailUrl: true,
        likeCount:    true,
        viewCount:    true,
        duration:     true,
        gradient:     true,
        emoji:        true,
        createdAt:    true,
        user: {
          select: {
            id:             true,
            username:       true,
            firstName:      true,
            lastName:       true,
            profileImage:   true,
            isVerified:     true,
            privateAccount: true,
          },
        },
      },
    })

    if (!reel) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const isOwner = session?.userId === reel.user.id
    let canView   = !reel.user.privateAccount || isOwner
    if (!canView && session) {
      const accepted = await prisma.follow.findFirst({
        where: { followerId: session.userId, followingId: reel.user.id, status: 'ACCEPTED' },
        select: { id: true },
      })
      canView = !!accepted
    }
    if (!canView) {
      return NextResponse.json(
        { message: 'This account is private', privateAccount: true },
        { status: 403 }
      )
    }

    return NextResponse.json({
      id:           reel.id,
      title:        reel.title,
      description:  reel.description,
      videoUrl:     reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl,
      likeCount:    reel.likeCount,
      viewCount:    reel.viewCount,
      duration:     reel.duration,
      gradient:     reel.gradient,
      emoji:        reel.emoji,
      createdAt:    reel.createdAt.toISOString(),
      user: {
        id:           reel.user.id,
        username:     reel.user.username,
        firstName:    reel.user.firstName,
        lastName:     reel.user.lastName,
        profileImage: reel.user.profileImage,
        isVerified:   reel.user.isVerified,
      },
    })
  } catch (error) {
    console.error('[reels/[id] GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
