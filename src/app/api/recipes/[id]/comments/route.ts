import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { sseBus } from '@/lib/sse'
import { createNotification } from '@/lib/notifications'
import { NotificationType } from '@/generated/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { commentCount: true },
  })

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comments = await prisma.recipeComment.findMany({
    where: { recipeId: id, parentId: null, isBanned: false },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      content: true,
      createdAt: true,
      user: { select: { username: true, profileImage: true } },
    },
  })

  return NextResponse.json({
    comments: comments.map(c => ({
      id: c.id,
      userId: c.userId,
      username: c.user.username,
      userAvatar: c.user.profileImage,
      text: c.content,
      createdAt: c.createdAt.toISOString(),
    })),
    commentCount: recipe.commentCount,
  })
}

export async function POST(req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const content = (body.content ?? '').trim()

  if (!content) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
  if (content.length > 1000) return NextResponse.json({ error: 'Comment too long' }, { status: 400 })

  const recipe = await prisma.recipe.findUnique({
    where:  { id },
    select: { id: true, userId: true, title: true, user: { select: { blockComments: true } } },
  })
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (recipe.user.blockComments) {
    return NextResponse.json({ error: 'Comments are disabled on this recipe' }, { status: 403 })
  }

  const [comment, updated] = await prisma.$transaction([
    prisma.recipeComment.create({
      data: { userId: session.userId, recipeId: id, content },
      select: {
        id: true,
        userId: true,
        content: true,
        createdAt: true,
        user: { select: { username: true, profileImage: true } },
      },
    }),
    prisma.recipe.update({
      where: { id },
      data: { commentCount: { increment: 1 } },
      select: { commentCount: true },
    }),
  ])

  const commentData = {
    id: comment.id,
    userId: comment.userId,
    username: comment.user.username,
    userAvatar: comment.user.profileImage,
    text: comment.content,
    createdAt: comment.createdAt.toISOString(),
  }

  sseBus.publish(`recipe:${id}`, 'recipe:commentAdded', {
    recipeId: id,
    commentCount: updated.commentCount,
    comment: commentData,
  })

  await createNotification({
    recipientId: recipe.userId,
    senderId: session.userId,
    senderUsername: session.username,
    type: NotificationType.RECIPE_COMMENT,
    recipeId: id,
    recipeTitle: recipe.title,
    commentId: comment.id,
    body: content.length > 100 ? content.slice(0, 100) + '…' : content,
  })

  return NextResponse.json(
    { comment: commentData, commentCount: updated.commentCount },
    { status: 201 },
  )
}
