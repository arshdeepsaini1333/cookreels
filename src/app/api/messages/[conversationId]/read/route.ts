import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { MessageStatus } from '@/generated/prisma'

type Context = { params: Promise<{ conversationId: string }> }

// PATCH /api/messages/[conversationId]/read — mark incoming messages as READ
export async function PATCH(_req: NextRequest, { params }: Context) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId } = await params

  // Verify participant
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ user1Id: session.userId }, { user2Id: session.userId }],
    },
    select: { id: true },
  })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: session.userId },
      status:   { not: MessageStatus.READ },
    },
    data: { status: MessageStatus.READ },
  })

  return NextResponse.json({ ok: true })
}
