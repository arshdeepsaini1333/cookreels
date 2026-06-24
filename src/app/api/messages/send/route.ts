import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

// POST /api/messages/send — send a message to a conversation
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { conversationId, content, imageUrl } = body as {
    conversationId: string
    content?: string
    imageUrl?: string | null
  }

  if (!conversationId || (!content?.trim() && !imageUrl)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify participant and get user order
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ user1Id: session.userId }, { user2Id: session.userId }],
    },
    select: { id: true, user1Id: true },
  })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isUser1 = conv.user1Id === session.userId

  // Create the message and unhide the conversation for the recipient in parallel
  const [message] = await Promise.all([
    prisma.message.create({
      data: {
        conversationId,
        senderId: session.userId,
        content:  content?.trim() ?? '',
        imageUrl: imageUrl ?? null,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data:  {
        lastMessageAt: new Date(),
        // Unhide for the recipient so the chat reappears after a "delete chat"
        ...(isUser1 ? { hiddenForUser2: false } : { hiddenForUser1: false }),
      },
    }),
  ])

  return NextResponse.json({ message })
}
