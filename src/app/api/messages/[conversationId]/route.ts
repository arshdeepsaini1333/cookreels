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
      sharedReel: {
        select: {
          id: true, title: true, thumbnailUrl: true, videoUrl: true, duration: true,
          user: { select: { id: true, firstName: true, lastName: true, username: true, privateAccount: true } },
        },
      },
      sharedRecipe: {
        select: {
          id: true, title: true, coverImage: true, cookTime: true,
          user: { select: { id: true, firstName: true, lastName: true, username: true, privateAccount: true } },
        },
      },
    },
  })

  const hasMore = messages.length > LIMIT
  if (hasMore) messages.pop()
  messages.reverse() // chronological order

  const nextCursor = hasMore ? messages[0]?.id ?? null : null

  // Collect all private creator IDs (reels + recipes) in one batch follow check
  const privateIds = new Set<string>()
  for (const m of messages) {
    if (m.sharedReel?.user.privateAccount   && m.sharedReel.user.id   !== session.userId) privateIds.add(m.sharedReel.user.id)
    if (m.sharedRecipe?.user.privateAccount && m.sharedRecipe.user.id !== session.userId) privateIds.add(m.sharedRecipe.user.id)
  }
  const followedSet = new Set<string>()
  if (privateIds.size > 0) {
    const accepted = await prisma.follow.findMany({
      where: { followerId: session.userId, followingId: { in: [...privateIds] }, status: 'ACCEPTED' },
      select: { followingId: true },
    })
    accepted.forEach(f => followedSet.add(f.followingId))
  }

  const canSee = (creatorId: string, isPrivate: boolean) =>
    !isPrivate || creatorId === session.userId || followedSet.has(creatorId)

  const serialized = messages.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    sharedReel: m.sharedReel
      ? {
          id:           m.sharedReel.id,
          title:        m.sharedReel.title,
          thumbnailUrl: m.sharedReel.thumbnailUrl,
          videoUrl:     m.sharedReel.videoUrl,
          duration:     m.sharedReel.duration,
          user: { firstName: m.sharedReel.user.firstName, lastName: m.sharedReel.user.lastName, username: m.sharedReel.user.username },
          viewerCanSee: canSee(m.sharedReel.user.id, m.sharedReel.user.privateAccount),
        }
      : null,
    sharedRecipe: m.sharedRecipe
      ? {
          id:          m.sharedRecipe.id,
          title:       m.sharedRecipe.title,
          coverImage:  m.sharedRecipe.coverImage,
          cookTime:    m.sharedRecipe.cookTime,
          user: { firstName: m.sharedRecipe.user.firstName, lastName: m.sharedRecipe.user.lastName, username: m.sharedRecipe.user.username },
          viewerCanSee: canSee(m.sharedRecipe.user.id, m.sharedRecipe.user.privateAccount),
        }
      : null,
  }))

  return NextResponse.json({ messages: serialized, nextCursor })
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
