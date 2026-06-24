import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { createNotification } from '@/lib/notifications'
import { FollowStatus, NotificationType } from '@/generated/prisma'

// GET /api/social/follow-requests — list pending incoming requests for current user
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const requests = await prisma.follow.findMany({
      where: { followingId: session.userId, status: FollowStatus.PENDING },
      select: {
        id: true,
        createdAt: true,
        follower: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      requests: requests.map(r => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        user: r.follower,
      })),
    })
  } catch (error) {
    console.error('[follow-requests GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

// PATCH /api/social/follow-requests — accept or decline a request
// body: { action: 'accept' | 'decline', requesterId: string }
export async function PATCH(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { action, requesterId } = await req.json()
    if (!requesterId || (action !== 'accept' && action !== 'decline')) {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
    }

    const followRecord = await prisma.follow.findFirst({
      where: {
        followerId:  requesterId,
        followingId: session.userId,
        status:      FollowStatus.PENDING,
      },
      select: { id: true },
    })

    if (!followRecord) {
      return NextResponse.json({ message: 'Follow request not found' }, { status: 404 })
    }

    if (action === 'accept') {
      await prisma.follow.update({
        where: { id: followRecord.id },
        data:  { status: FollowStatus.ACCEPTED },
      })
      // Convert the FOLLOW_REQUEST notification to FOLLOW so reloads show "started following you"
      await prisma.notification.updateMany({
        where: {
          recipientId: session.userId,
          senderId:    requesterId,
          type:        NotificationType.FOLLOW_REQUEST,
        },
        data: { type: NotificationType.FOLLOW },
      })
      await createNotification({
        recipientId:     requesterId,
        senderId:        session.userId,
        senderUsername:  session.username,
        type:            NotificationType.FOLLOW_ACCEPTED,
      })
      return NextResponse.json({ success: true, action: 'accepted' })
    } else {
      await prisma.follow.delete({ where: { id: followRecord.id } })
      return NextResponse.json({ success: true, action: 'declined' })
    }
  } catch (error) {
    console.error('[follow-requests PATCH]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
