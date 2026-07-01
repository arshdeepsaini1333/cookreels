import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { NotificationType } from '@/generated/prisma'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { targetUserId } = await req.json()
    if (!targetUserId) return NextResponse.json({ message: 'Missing targetUserId' }, { status: 400 })
    if (targetUserId === session.userId) return NextResponse.json({ message: 'Cannot block yourself' }, { status: 400 })

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    if (!target) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    await prisma.block.create({
      data: { blockerId: session.userId, blockedId: targetUserId },
    })

    // Blocking severs any existing social ties both ways, like Instagram —
    // the blocked user is unfollowed/removed as a follower and any pending
    // follow request is cancelled.
    await Promise.all([
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: session.userId, followingId: targetUserId },
            { followerId: targetUserId, followingId: session.userId },
          ],
        },
      }),
      prisma.friendship.deleteMany({
        where: {
          OR: [
            { userId1: session.userId, userId2: targetUserId },
            { userId1: targetUserId, userId2: session.userId },
          ],
        },
      }),
      prisma.notification.deleteMany({
        where: {
          type: { in: [NotificationType.FOLLOW, NotificationType.FOLLOW_REQUEST, NotificationType.FOLLOW_ACCEPTED] },
          OR: [
            { senderId: session.userId, recipientId: targetUserId },
            { senderId: targetUserId, recipientId: session.userId },
          ],
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ message: 'Already blocked' }, { status: 409 })
    }
    console.error('[block POST]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { targetUserId } = await req.json()
    if (!targetUserId) return NextResponse.json({ message: 'Missing targetUserId' }, { status: 400 })

    await prisma.block.deleteMany({
      where: { blockerId: session.userId, blockedId: targetUserId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[block DELETE]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
