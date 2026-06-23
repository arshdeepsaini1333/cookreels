import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sseBus } from '@/lib/sse'

export async function PATCH() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.notification.updateMany({
    where: { recipientId: session.userId, isRead: false },
    data: { isRead: true },
  })

  sseBus.publish(`notifications:${session.userId}`, 'notification:allRead', { unreadCount: 0 })

  return NextResponse.json({ success: true, unreadCount: 0 })
}
