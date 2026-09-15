import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getBlockRelation } from '@/lib/blocks'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const session = await getSession()

    const reel = await prisma.reel.findUnique({
      where: { id },
      select: {
        id:           true,
        title:        true,
        description:  true,
        videoUrl:     true,
        thumbnailUrl: true,
        likeCount:    true,
        commentCount: true,
        viewCount:    true,
        duration:     true,
        gradient:     true,
        emoji:        true,
        isPublished:  true,
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
            hideLikeCount:  true,
            blockComments:  true,
            _count: { select: { recipes: { where: { isPublished: true } } } },
          },
        },
      },
    })

    if (!reel) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const isOwner = session?.userId === reel.user.id

    // Archived reels are only visible to their owner.
    if (!reel.isPublished && !isOwner) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    let isFollowing = false
    if (session && !isOwner) {
      const accepted = await prisma.follow.findFirst({
        where: { followerId: session.userId, followingId: reel.user.id, status: 'ACCEPTED' },
        select: { id: true },
      })
      isFollowing = !!accepted
    }
    let canView = !reel.user.privateAccount || isOwner || isFollowing
    if (!isOwner) {
      const { blockedByViewer, blockedViewer } = await getBlockRelation(session?.userId, reel.user.id)
      if (blockedByViewer || blockedViewer) canView = false
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
      commentCount: reel.commentCount,
      viewCount:    reel.viewCount,
      duration:     reel.duration,
      gradient:     reel.gradient,
      emoji:        reel.emoji,
      createdAt:    reel.createdAt.toISOString(),
      isOwner,
      isFollowing,
      hideLikeCount: reel.user.hideLikeCount,
      blockComments: reel.user.blockComments,
      user: {
        id:           reel.user.id,
        username:     reel.user.username,
        firstName:    reel.user.firstName,
        lastName:     reel.user.lastName,
        profileImage: reel.user.profileImage,
        isVerified:   reel.user.isVerified,
        topChef:      reel.user._count.recipes >= 10,
      },
    })
  } catch (error) {
    console.error('[reels/[id] GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const reel = await prisma.reel.findUnique({ where: { id }, select: { userId: true } })
    if (!reel) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    if (reel.userId !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (typeof body.title === 'string') data.title = body.title.trim()
    if (typeof body.description === 'string') data.description = body.description.trim()
    if (typeof body.isPublished === 'boolean') data.isPublished = body.isPublished

    const updated = await prisma.reel.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[reels/[id] PATCH]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const reel = await prisma.reel.findUnique({ where: { id }, select: { userId: true } })
    if (!reel) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    if (reel.userId !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    await prisma.reel.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[reels/[id] DELETE]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
