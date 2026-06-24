import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Context = { params: Promise<{ conversationId: string }> }

// GET /api/messages/[conversationId] — fetch paginated messages
export async function GET(req: NextRequest, { params }: Context) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId } = await params

  // Verify participant and get cleared-at timestamps
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ user1Id: session.userId }, { user2Id: session.userId }],
    },
    select: {
      id: true,
      user1Id: true,
      clearedByUser1At: true,
      clearedByUser2At: true,
    },
  })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isUser1   = conv.user1Id === session.userId
  const clearedAt = isUser1 ? conv.clearedByUser1At : conv.clearedByUser2At

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const LIMIT  = 40

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      // Hide messages deleted for current user
      NOT: { deletedForUserIds: { has: session.userId } },
      // Hide messages before the user's clear timestamp
      ...(clearedAt ? { createdAt: { gt: clearedAt } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take:    LIMIT + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
    },
  })

  const hasMore = messages.length > LIMIT
  if (hasMore) messages.pop()
  messages.reverse() // chronological order

  const nextCursor = hasMore ? messages[0]?.id ?? null : null

  return NextResponse.json({ messages, nextCursor })
}

// DELETE /api/messages/[conversationId] — clear chat for current user
export async function DELETE(_req: NextRequest, { params }: Context) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId } = await params

  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ user1Id: session.userId }, { user2Id: session.userId }],
    },
    select: { id: true, user1Id: true },
  })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isUser1 = conv.user1Id === session.userId
  const now     = new Date()

  await prisma.conversation.update({
    where: { id: conversationId },
    data:  isUser1
      ? { hiddenForUser1: true, clearedByUser1At: now }
      : { hiddenForUser2: true, clearedByUser2At: now },
  })

  return NextResponse.json({ ok: true })
}
