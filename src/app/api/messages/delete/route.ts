import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

// POST /api/messages/delete — delete a message for me or for everyone
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId, type } = await req.json() as {
    messageId: string
    type: 'for_me' | 'for_everyone'
  }

  if (!messageId || !['for_me', 'for_everyone'].includes(type)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Fetch the message and verify the user is a participant
  const message = await prisma.message.findFirst({
    where: { id: messageId },
    include: {
      conversation: {
        select: { user1Id: true, user2Id: true },
      },
    },
  })

  if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { user1Id, user2Id } = message.conversation
  if (session.userId !== user1Id && session.userId !== user2Id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (type === 'for_everyone') {
    // Only the sender can delete for everyone
    if (message.senderId !== session.userId) {
      return NextResponse.json({ error: 'Only the sender can delete for everyone' }, { status: 403 })
    }
    await prisma.message.update({
      where: { id: messageId },
      data:  { deletedForEveryone: true, content: '', imageUrl: null },
    })
  } else {
    // "Delete for me" — add userId to the deletedForUserIds array
    await prisma.message.update({
      where: { id: messageId },
      data:  {
        deletedForUserIds: {
          push: session.userId,
        },
      },
    })
  }

  return NextResponse.json({ ok: true })
}
