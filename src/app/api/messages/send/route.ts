import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { sseBus } from '@/lib/sse'
import { createNotification } from '@/lib/notifications'
import { MessageType, NotificationType } from '@/generated/prisma'

// POST /api/messages/send — send a text, image, reel-share, or recipe-share message
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    conversationId,
    content,
    imageUrl,
    messageType = 'TEXT',
    sharedReelId,
    sharedRecipeId,
  } = body as {
    conversationId: string
    content?: string
    imageUrl?: string | null
    messageType?: string
    sharedReelId?: string
    sharedRecipeId?: string
  }

  const isShareType = messageType === 'REEL_SHARE' || messageType === 'RECIPE_SHARE'
  const isImageType = messageType === 'IMAGE' || Boolean(imageUrl)

  if (!conversationId || (!content?.trim() && !isShareType && !isImageType)) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Verify conversation + participant IDs
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ user1Id: session.userId }, { user2Id: session.userId }],
    },
    select: { id: true, user1Id: true, user2Id: true, status: true, requestedById: true },
  })
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (conv.status === 'DECLINED') {
    return NextResponse.json({ error: 'Conversation was declined' }, { status: 403 })
  }
  if (conv.status === 'PENDING' && conv.requestedById !== session.userId) {
    return NextResponse.json({ error: 'Accept the message request first' }, { status: 403 })
  }

  // Validate shared content exists and is published
  if (messageType === 'REEL_SHARE') {
    if (!sharedReelId) return NextResponse.json({ error: 'Missing sharedReelId' }, { status: 400 })
    const reel = await prisma.reel.findFirst({ where: { id: sharedReelId, isPublished: true }, select: { id: true } })
    if (!reel) return NextResponse.json({ error: 'Reel not found or not published' }, { status: 404 })
  }
  if (messageType === 'RECIPE_SHARE') {
    if (!sharedRecipeId) return NextResponse.json({ error: 'Missing sharedRecipeId' }, { status: 400 })
    const recipe = await prisma.recipe.findFirst({ where: { id: sharedRecipeId, isPublished: true }, select: { id: true } })
    if (!recipe) return NextResponse.json({ error: 'Recipe not found or not published' }, { status: 404 })
  }

  const isUser1     = conv.user1Id === session.userId
  const recipientId = isUser1 ? conv.user2Id : conv.user1Id

  // Determine the effective message type for IMAGE messages
  const effectiveType: MessageType =
    isShareType ? (messageType as MessageType) :
    isImageType ? MessageType.IMAGE :
    MessageType.TEXT

  const [message] = await Promise.all([
    prisma.message.create({
      data: {
        conversationId,
        senderId:       session.userId,
        content:        content?.trim() ?? '',
        imageUrl:       imageUrl ?? null,
        messageType:    effectiveType,
        sharedReelId:   messageType === 'REEL_SHARE'   ? (sharedReelId   ?? null) : null,
        sharedRecipeId: messageType === 'RECIPE_SHARE' ? (sharedRecipeId ?? null) : null,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, username: true, profileImage: true },
        },
        sharedReel: {
          select: {
            id: true, title: true, thumbnailUrl: true, videoUrl: true, duration: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        sharedRecipe: {
          select: {
            id: true, title: true, coverImage: true, cookTime: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        ...(isUser1 ? { hiddenForUser2: false } : { hiddenForUser1: false }),
      },
    }),
  ])

  // Publish SSE event so recipient receives message in real-time
  const serialized = {
    ...message,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
  }
  sseBus.publish(`messages:${recipientId}`, 'message:new', { conversationId, message: serialized })

  // Send in-app notification for share types
  if (messageType === 'REEL_SHARE' && sharedReelId) {
    const reel = await prisma.reel.findFirst({ where: { id: sharedReelId }, select: { title: true } })
    if (reel) {
      createNotification({
        recipientId,
        senderId:       session.userId,
        senderUsername: session.username,
        type:           NotificationType.REEL_SHARE,
        reelId:         sharedReelId,
        reelTitle:      reel.title,
      }).catch(() => {})
    }
  } else if (messageType === 'RECIPE_SHARE' && sharedRecipeId) {
    const recipe = await prisma.recipe.findFirst({ where: { id: sharedRecipeId }, select: { title: true } })
    if (recipe) {
      createNotification({
        recipientId,
        senderId:       session.userId,
        senderUsername: session.username,
        type:           NotificationType.RECIPE_SHARE,
        recipeId:       sharedRecipeId,
        recipeTitle:    recipe.title,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ message: serialized })
}
