import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string; commentId: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: reelId, commentId } = await params

  const comment = await prisma.reelComment.findFirst({
    where: { id: commentId, reelId },
    select: { id: true, userId: true },
  })

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
  if (comment.userId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { commentId } }),
    prisma.reelComment.delete({ where: { id: commentId } }),
    prisma.reel.update({
      where: { id: reelId },
      data: { commentCount: { decrement: 1 } },
    }),
  ])

  return NextResponse.json({ success: true })
}
