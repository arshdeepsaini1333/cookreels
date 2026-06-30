import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { MessageStatus } from '@/generated/prisma'

// GET /api/messages/conversations — mutual friends + existing conversations
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = session

  try {
    const [friends, conversations] = await Promise.all([
      // Mutual follows: users who I follow AND who follow me back
      prisma.user.findMany({
        where: {
          id:        { not: userId },
          followers: { some: { followerId: userId } },
          following: { some: { followingId: userId } },
        },
        select: { id: true, firstName: true, lastName: true, username: true, profileImage: true, isOnline: true },
      }),
      // Existing DM threads — exclude hidden and declined
      prisma.conversation.findMany({
        where: {
          OR: [
            { user1Id: userId, hiddenForUser1: false },
            { user2Id: userId, hiddenForUser2: false },
          ],
          status: { not: 'DECLINED' },
        },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          user1: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true, isOnline: true } },
          user2: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true, isOnline: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take:    1,
            where:   { deletedForEveryone: false },
            select:  { content: true, imageUrl: true, messageType: true, senderId: true, status: true, createdAt: true },
          },
          _count: {
            select: {
              messages: {
                where: {
                  senderId:           { not: userId },
                  status:             { not: MessageStatus.READ },
                  deletedForEveryone: false,
                },
              },
            },
          },
        },
      }),
    ])

    // Shape conversation data — include status and requestedById
    const convData = conversations.map(conv => {
      const other = conv.user1Id === userId ? conv.user2 : conv.user1
      const last  = conv.messages[0] ?? null
      return {
        id:   conv.id,
        status:        conv.status,
        requestedById: conv.requestedById,
        user: {
          id:       other.id,
          name:     `${other.firstName} ${other.lastName}`,
          username: other.username,
          avatar:   other.profileImage,
          isOnline: other.isOnline,
        },
        lastMessage: last
          ? {
              content: last.messageType === 'REEL_SHARE' ? '🎥 Shared a Reel'
                     : last.messageType === 'RECIPE_SHARE' ? '🍲 Shared a Recipe'
                     : last.content || (last.imageUrl ? '📷 Photo' : ''),
              messageType: last.messageType,
              senderId:    last.senderId,
              status:      last.status,
              createdAt:   last.createdAt,
            }
          : null,
        unreadCount:   conv._count.messages,
        lastMessageAt: conv.lastMessageAt,
      }
    })

    // Friends who don't have any conversation yet — show at the bottom
    const convFriendIds = new Set(convData.map(c => c.user.id))
    const freshFriends  = friends
      .filter(f => !convFriendIds.has(f.id))
      .map(f => ({
        id:            null as string | null,
        status:        'OPEN' as const,
        requestedById: null as string | null,
        user: {
          id:       f.id,
          name:     `${f.firstName} ${f.lastName}`,
          username: f.username,
          avatar:   f.profileImage,
          isOnline: f.isOnline,
        },
        lastMessage:   null,
        unreadCount:   0,
        lastMessageAt: null,
      }))

    return NextResponse.json({ conversations: [...convData, ...freshFriends] })
  } catch (err) {
    console.error('[messages/conversations GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/messages/conversations — open/create a conversation with any user
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId: targetUserId } = await req.json()
  if (!targetUserId || targetUserId === session.userId) {
    return NextResponse.json({ error: 'Invalid target user' }, { status: 400 })
  }

  const [user1Id, user2Id] = [session.userId, targetUserId].sort()

  // Check mutual follow
  const [iFollow, theyFollow] = await Promise.all([
    prisma.follow.findFirst({
      where: { followerId: session.userId, followingId: targetUserId, status: 'ACCEPTED' },
      select: { id: true },
    }),
    prisma.follow.findFirst({
      where: { followerId: targetUserId, followingId: session.userId, status: 'ACCEPTED' },
      select: { id: true },
    }),
  ])
  const isMutual = !!(iFollow && theyFollow)

  // Check for existing conversation
  const existing = await prisma.conversation.findFirst({
    where: { user1Id, user2Id },
    select: { id: true, status: true, requestedById: true },
  })

  if (existing) {
    // Allow re-requesting after a decline if current user was original requester
    if (existing.status === 'DECLINED' && existing.requestedById === session.userId) {
      await prisma.conversation.update({
        where: { id: existing.id },
        data: { status: 'PENDING', declinedAt: null },
      })
    }
    return NextResponse.json({ conversationId: existing.id })
  }

  const conversation = await prisma.conversation.create({
    data: {
      user1Id,
      user2Id,
      status:        isMutual ? 'OPEN'    : 'PENDING',
      requestedById: isMutual ? null      : session.userId,
    },
    select: { id: true },
  })

  return NextResponse.json({ conversationId: conversation.id })
}
