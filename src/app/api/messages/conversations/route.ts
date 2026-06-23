import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { MessageStatus } from '@/generated/prisma'

// GET /api/messages/conversations — all friends, with existing conversations sorted first
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = session

  // Run both queries in parallel
  const [friends, conversations] = await Promise.all([
    // Mutual follows = friends
    prisma.follow.findMany({
      where: {
        followerId: userId,
        following: { following: { some: { followingId: userId } } },
      },
      include: {
        following: {
          select: { id: true, firstName: true, lastName: true, username: true, profileImage: true, isOnline: true },
        },
      },
    }),
    // Existing DM threads
    prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        user1: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true, isOnline: true } },
        user2: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true, isOnline: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, senderId: true, status: true, createdAt: true },
        },
        _count: {
          select: {
            messages: {
              where: { senderId: { not: userId }, status: { not: MessageStatus.READ } },
            },
          },
        },
      },
    }),
  ])

  // Conversations with full data
  const convData = conversations.map(conv => {
    const other = conv.user1Id === userId ? conv.user2 : conv.user1
    const last  = conv.messages[0] ?? null
    return {
      id:       conv.id,
      user: {
        id:       other.id,
        name:     `${other.firstName} ${other.lastName}`,
        username: other.username,
        avatar:   other.profileImage,
        isOnline: other.isOnline,
      },
      lastMessage:   last ? { content: last.content, senderId: last.senderId, status: last.status, createdAt: last.createdAt } : null,
      unreadCount:   conv._count.messages,
      lastMessageAt: conv.lastMessageAt,
    }
  })

  // Friends who don't have a conversation yet — append after conversations
  const convFriendIds = new Set(convData.map(c => c.user.id))
  const freshFriends = friends
    .filter(f => !convFriendIds.has(f.following.id))
    .map(f => ({
      id:            null as string | null,
      user: {
        id:       f.following.id,
        name:     `${f.following.firstName} ${f.following.lastName}`,
        username: f.following.username,
        avatar:   f.following.profileImage,
        isOnline: f.following.isOnline,
      },
      lastMessage:   null,
      unreadCount:   0,
      lastMessageAt: null,
    }))

  return NextResponse.json({ conversations: [...convData, ...freshFriends] })
}

// POST /api/messages/conversations — open/create a conversation with a friend
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId: targetUserId } = await req.json()
  if (!targetUserId || targetUserId === session.userId) {
    return NextResponse.json({ error: 'Invalid target user' }, { status: 400 })
  }

  // Enforce consistent ordering so the @@unique constraint works
  const [user1Id, user2Id] = [session.userId, targetUserId].sort()

  const conversation = await prisma.conversation.upsert({
    where:  { user1Id_user2Id: { user1Id, user2Id } },
    create: { user1Id, user2Id },
    update: {},
    select: { id: true },
  })

  return NextResponse.json({ conversationId: conversation.id })
}
