import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { createNotification } from '@/lib/notifications'
import { FollowStatus, NotificationType } from '@/generated/prisma'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { targetUserId } = await req.json()
    if (!targetUserId) return NextResponse.json({ message: 'Missing targetUserId' }, { status: 400 })
    if (targetUserId === session.userId) return NextResponse.json({ message: 'Cannot follow yourself' }, { status: 400 })

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, privateAccount: true },
    })
    if (!target) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    if (target.privateAccount) {
      await prisma.follow.create({
        data: { followerId: session.userId, followingId: targetUserId, status: FollowStatus.PENDING },
      })
      await createNotification({
        recipientId: targetUserId,
        senderId: session.userId,
        senderUsername: session.username,
        type: NotificationType.FOLLOW_REQUEST,
      })
      return NextResponse.json({ success: true, status: 'pending' })
    } else {
      await prisma.follow.create({
        data: { followerId: session.userId, followingId: targetUserId },
      })
      await createNotification({
        recipientId: targetUserId,
        senderId: session.userId,
        senderUsername: session.username,
        type: NotificationType.FOLLOW,
      })
      return NextResponse.json({ success: true, status: 'accepted' })
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ message: 'Already following' }, { status: 409 })
    }
    console.error('[follow POST]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { targetUserId } = await req.json()
    if (!targetUserId) return NextResponse.json({ message: 'Missing targetUserId' }, { status: 400 })

    await prisma.follow.deleteMany({
      where: { followerId: session.userId, followingId: targetUserId },
    })

    await prisma.notification.deleteMany({
      where: {
        senderId: session.userId,
        recipientId: targetUserId,
        type: { in: [NotificationType.FOLLOW, NotificationType.FOLLOW_REQUEST] },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[follow DELETE]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
