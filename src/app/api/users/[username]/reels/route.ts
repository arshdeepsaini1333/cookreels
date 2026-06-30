import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ username: string }> }

export async function GET(req: Request, { params }: Params) {
  try {
    const { username } = await params
    const session = await getSession()
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, Number(searchParams.get('page')  ?? '1'))
    const limit = Math.min(24, Math.max(1, Number(searchParams.get('limit') ?? '12')))

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, privateAccount: true },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const isOwner = session?.userId === user.id
    let canView   = !user.privateAccount || isOwner
    if (!canView && session) {
      const accepted = await prisma.follow.findFirst({
        where: { followerId: session.userId, followingId: user.id, status: 'ACCEPTED' },
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

    const where = { userId: user.id, isPublished: true }

    const [reels, total] = await Promise.all([
      prisma.reel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id:           true,
          title:        true,
          thumbnailUrl: true,
          duration:     true,
          viewCount:    true,
          likeCount:    true,
        },
      }),
      prisma.reel.count({ where }),
    ])

    return NextResponse.json({
      reels,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[users/[username]/reels GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
