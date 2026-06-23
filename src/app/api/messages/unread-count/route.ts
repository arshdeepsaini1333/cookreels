import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { MessageStatus } from '@/generated/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ count: 0 })

  const count = await prisma.conversation.count({
    where: {
      OR: [{ user1Id: session.userId }, { user2Id: session.userId }],
      messages: {
        some: {
          senderId: { not: session.userId },
          status: { not: MessageStatus.READ },
        },
      },
    },
  })

  return NextResponse.json({ count })
}
