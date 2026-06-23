import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Context = { params: Promise<{ conversationId: string }> }

// GET /api/messages/[conversationId] — fetch paginated messages
export async function GET(req: NextRequest, { params }: Context) {
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

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const LIMIT  = 40

  const messages = await prisma.message.findMany({
    where:   { conversationId },
    orderBy: { createdAt: 'desc' },
    take:    LIMIT + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
    },
  })

  const hasMore  = messages.length > LIMIT
  if (hasMore) messages.pop()
  messages.reverse() // chronological order

  const nextCursor = hasMore ? messages[0]?.id ?? null : null

  return NextResponse.json({ messages, nextCursor })
} 
