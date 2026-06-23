import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { NotificationType } from '@/generated/prisma'

// Development-only diagnostic endpoint
// Visit /api/notifications/debug to see the health of the notification system
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const session = await getSession()

  if (!session) {
    return NextResponse.json({
      status: 'error',
      problem: 'NOT AUTHENTICATED — session cookie missing or expired',
      fix: 'Log in again at /auth/login',
    })
  }

  try {
    // 1. Count all notifications for this user
    const totalCount = await prisma.notification.count({
      where: { recipientId: session.userId },
    })

    const unreadCount = await prisma.notification.count({
      where: { recipientId: session.userId, isRead: false },
    })

    // 2. Get the 3 most recent notifications (any user)
    const recent = await prisma.notification.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        isRead: true,
        createdAt: true,
        recipientId: true,
        senderId: true,
      },
    })

    // 3. Try creating a self-notification to verify DB write works
    let createTest: { ok: boolean; error?: string; id?: string } = { ok: false }
    try {
      const n = await prisma.notification.create({
        data: {
          recipientId: session.userId,
          senderId: session.userId,
          type: NotificationType.FOLLOW,
          body: 'Debug test notification',
        },
        select: { id: true },
      })
      // Delete it immediately — it's just a test
      await prisma.notification.delete({ where: { id: n.id } })
      createTest = { ok: true, id: n.id }
    } catch (err) {
      createTest = { ok: false, error: String(err) }
    }

    return NextResponse.json({
      status: 'ok',
      userId: session.userId,
      username: session.username,
      notifications: { totalCount, unreadCount },
      recentInDB: recent,
      createTest,
      message: createTest.ok
        ? '✅ DB write works. If you see 0 notifications, the routes are not calling createNotification. Check terminal for [notification] errors.'
        : `❌ DB write FAILED: ${createTest.error}`,
    })
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      problem: String(err),
      fix: 'Likely a Prisma schema mismatch — run: npx prisma db push && npx prisma generate, then restart dev server',
    })
  }
}
