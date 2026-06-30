import { prisma } from './prisma'
import { sseBus } from './sse'
import { NotificationType } from '@/generated/prisma'

export type NotificationPayload = {
  id: string
  type: string
  isRead: boolean
  createdAt: string
  text: string | null
  body: string | null
  sender: { id: string; username: string; profileImage: string | null }
  recipe: { id: string; title: string; coverImage: string | null } | null
  reel: { id: string; title: string; thumbnailUrl: string | null } | null
}

type CreateInput = {
  recipientId: string
  senderId: string
  senderUsername: string
  type: NotificationType
  recipeId?: string
  recipeTitle?: string
  reelId?: string
  reelTitle?: string
  commentId?: string
  body?: string
}

function buildText(input: CreateInput): string {
  const name = input.senderUsername

  switch (input.type) {
    case NotificationType.FOLLOW:
      return `${name} started following you.`

    case NotificationType.FOLLOW_REQUEST:
      return `${name} requested to follow you.`

    case NotificationType.FOLLOW_ACCEPTED:
      return `${name} accepted your follow request.`

    case NotificationType.RECIPE_LIKE:
      return input.recipeTitle
        ? `${name} liked your recipe "${input.recipeTitle}".`
        : `${name} liked your recipe.`

    case NotificationType.RECIPE_COMMENT:
      if (input.recipeTitle && input.body) {
        return `${name} commented on "${input.recipeTitle}": ${input.body}`
      }
      return input.recipeTitle
        ? `${name} commented on your recipe "${input.recipeTitle}".`
        : `${name} commented on your recipe.`

    case NotificationType.REEL_LIKE:
      return input.reelTitle
        ? `${name} liked your reel "${input.reelTitle}".`
        : `${name} liked your reel.`

    case NotificationType.REEL_COMMENT:
      if (input.reelTitle && input.body) {
        return `${name} commented on "${input.reelTitle}": ${input.body}`
      }
      return input.reelTitle
        ? `${name} commented on your reel "${input.reelTitle}".`
        : `${name} commented on your reel.`

    case NotificationType.REEL_SHARE:
      return input.reelTitle
        ? `${name} shared a reel "${input.reelTitle}" with you.`
        : `${name} shared a reel with you.`

    case NotificationType.RECIPE_SHARE:
      return input.recipeTitle
        ? `${name} shared a recipe "${input.recipeTitle}" with you.`
        : `${name} shared a recipe with you.`

    default:
      return `${name} interacted with your content.`
  }
}

function serialize(n: {
  id: string
  type: NotificationType
  isRead: boolean
  createdAt: Date
  text: string | null
  body: string | null
  sender: { id: string; username: string; profileImage: string | null }
  recipe: { id: string; title: string; coverImage: string | null } | null
  reel: { id: string; title: string; thumbnailUrl: string | null } | null
}): NotificationPayload {
  return {
    id: n.id,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
    text: n.text,
    body: n.body,
    sender: n.sender,
    recipe: n.recipe,
    reel: n.reel,
  }
}

export async function createNotification(input: CreateInput): Promise<void> {
  if (input.recipientId === input.senderId) return

  try {
    const text = buildText(input)

    const notification = await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        senderId: input.senderId,
        type: input.type,
        recipeId: input.recipeId ?? null,
        reelId: input.reelId ?? null,
        commentId: input.commentId ?? null,
        body: input.body ?? null,
        text,
      },
      select: {
        id: true,
        type: true,
        isRead: true,
        createdAt: true,
        text: true,
        body: true,
        sender: { select: { id: true, username: true, profileImage: true } },
        recipe: { select: { id: true, title: true, coverImage: true } },
        reel: { select: { id: true, title: true, thumbnailUrl: true } },
      },
    })

    sseBus.publish(`notifications:${input.recipientId}`, 'notification:new', {
      notification: serialize(notification),
    })
  } catch (err) {
    console.error('[notification] create failed:', err)
  }
}
