import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ count: 0 })

  const count = await prisma.notification.count({
    where: { recipientId: session.userId, isRead: false },
  })

  return NextResponse.json({ count })
}
