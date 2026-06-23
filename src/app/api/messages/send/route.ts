import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

// POST /api/messages/send — send a message to a conversation
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { conversationId, content } = body as { conversationId: string; content: string }

  if (!conversationId || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify participant
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ user1Id: session.userId }, { user2Id: session.userId }],
    },
    select: { id: true },
  })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const message = await prisma.message.create({
    data: { conversationId, senderId: session.userId, content: content.trim() },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
    },
  })

  await prisma.conversation.update({
    where: { id: conversationId },
    data:  { lastMessageAt: new Date() },
  })

  return NextResponse.json({ message })
}
