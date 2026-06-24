import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params

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
            id:           true,
            username:     true,
            firstName:    true,
            lastName:     true,
            profileImage: true,
            isVerified:   true,
          },
        },
      },
    })

    if (!reel) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
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
