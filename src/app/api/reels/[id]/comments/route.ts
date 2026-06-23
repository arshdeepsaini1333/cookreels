import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { sseBus } from '@/lib/sse'
import { createNotification } from '@/lib/notifications'
import { NotificationType } from '@/generated/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params

  const reel = await prisma.reel.findUnique({
    where: { id },
    select: { commentCount: true },
  })

  if (!reel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const comments = await prisma.reelComment.findMany({
    where: { reelId: id, parentId: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { username: true, profileImage: true } },
    },
  })

  return NextResponse.json({
    comments: comments.map(c => ({
      id: c.id,
      username: c.user.username,
      userAvatar: c.user.profileImage,
      text: c.content,
      createdAt: c.createdAt.toISOString(),
    })),
    commentCount: reel.commentCount,
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

  const reel = await prisma.reel.findUnique({ where: { id }, select: { id: true, userId: true, title: true } })
  if (!reel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [comment, updated] = await prisma.$transaction([
    prisma.reelComment.create({
      data: { userId: session.userId, reelId: id, content },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { username: true, profileImage: true } },
      },
    }),
    prisma.reel.update({
      where: { id },
      data: { commentCount: { increment: 1 } },
      select: { commentCount: true },
    }),
  ])

  const commentData = {
    id: comment.id,
    username: comment.user.username,
    userAvatar: comment.user.profileImage,
    text: comment.content,
    createdAt: comment.createdAt.toISOString(),
  }

  sseBus.publish(`reel:${id}`, 'reel:commentAdded', {
    reelId: id,
    commentCount: updated.commentCount,
    comment: commentData,
  })

  await createNotification({
    recipientId: reel.userId,
    senderId: session.userId,
    senderUsername: session.username,
    type: NotificationType.REEL_COMMENT,
    reelId: id,
    reelTitle: reel.title,
    commentId: comment.id,
    body: content.length > 100 ? content.slice(0, 100) + '…' : content,
  })

  return NextResponse.json(
    { comment: commentData, commentCount: updated.commentCount },
    { status: 201 },
  )
}
