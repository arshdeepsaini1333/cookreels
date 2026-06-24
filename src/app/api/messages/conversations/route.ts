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
          // they follow me
          followers: { some: { followerId: userId } },
          // I follow them
          following: { some: { followingId: userId } },
        },
        select: { id: true, firstName: true, lastName: true, username: true, profileImage: true, isOnline: true },
      }),
      // Existing DM threads — exclude ones this user has hidden
      prisma.conversation.findMany({
        where: {
          OR: [
            { user1Id: userId, hiddenForUser1: false },
            { user2Id: userId, hiddenForUser2: false },
          ],
        },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          user1: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true, isOnline: true } },
          user2: { select: { id: true, firstName: true, lastName: true, username: true, profileImage: true, isOnline: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take:    1,
            where:   { deletedForEveryone: false },
            select:  { content: true, imageUrl: true, senderId: true, status: true, createdAt: true },
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

    // Shape conversation data
    const convData = conversations.map(conv => {
      const other = conv.user1Id === userId ? conv.user2 : conv.user1
      const last  = conv.messages[0] ?? null
      return {
        id:   conv.id,
        user: {
          id:       other.id,
          name:     `${other.firstName} ${other.lastName}`,
          username: other.username,
          avatar:   other.profileImage,
          isOnline: other.isOnline,
        },
        lastMessage: last
          ? {
              content:   last.content || (last.imageUrl ? '📷 Photo' : ''),
              senderId:  last.senderId,
              status:    last.status,
              createdAt: last.createdAt,
            }
          : null,
        unreadCount:   conv._count.messages,
        lastMessageAt: conv.lastMessageAt,
      }
    })

    // Friends who don't have a visible conversation yet — show at the bottom
    const convFriendIds = new Set(convData.map(c => c.user.id))
    const freshFriends  = friends
      .filter(f => !convFriendIds.has(f.id))
      .map(f => ({
        id:            null as string | null,
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

// POST /api/messages/conversations — open/create a conversation with a friend
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId: targetUserId } = await req.json()
  if (!targetUserId || targetUserId === session.userId) {
    return NextResponse.json({ error: 'Invalid target user' }, { status: 400 })
  }

  const [user1Id, user2Id] = [session.userId, targetUserId].sort()

  const conversation = await prisma.conversation.upsert({
    where:  { user1Id_user2Id: { user1Id, user2Id } },
    create: { user1Id, user2Id },
    update: {},
    select: { id: true },
  })

  return NextResponse.json({ conversationId: conversation.id })
}
