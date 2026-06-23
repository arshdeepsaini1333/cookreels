import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sseBus } from '@/lib/sse'

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.ids) ? body.ids : []

  if (ids.length === 0) return NextResponse.json({ error: 'No ids provided' }, { status: 400 })

  await prisma.notification.updateMany({
    where: { id: { in: ids }, recipientId: session.userId },
    data: { isRead: true },
  })

  const unreadCount = await prisma.notification.count({
    where: { recipientId: session.userId, isRead: false },
  })

  sseBus.publish(`notifications:${session.userId}`, 'notification:read', { ids, unreadCount })

  return NextResponse.json({ success: true, unreadCount })
}
