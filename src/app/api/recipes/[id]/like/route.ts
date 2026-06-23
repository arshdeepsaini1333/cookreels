import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { sseBus } from '@/lib/sse'
import { createNotification } from '@/lib/notifications'
import { NotificationType } from '@/generated/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = session.userId

  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { id: true, userId: true, title: true } })
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await prisma.recipeLike.create({ data: { userId, recipeId: id } })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Already liked' }, { status: 409 })
    }
    throw e
  }

  const updated = await prisma.recipe.update({
    where: { id },
    data: { likeCount: { increment: 1 } },
    select: { likeCount: true },
  })

  sseBus.publish(`recipe:${id}`, 'recipe:liked', {
    recipeId: id,
    likeCount: updated.likeCount,
    userId,
  })

  await createNotification({
    recipientId: recipe.userId,
    senderId: userId,
    senderUsername: session.username,
    type: NotificationType.RECIPE_LIKE,
    recipeId: id,
    recipeTitle: recipe.title,
  })

  return NextResponse.json({ likeCount: updated.likeCount, liked: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = session.userId

  const deleted = await prisma.recipeLike.deleteMany({
    where: { userId, recipeId: id },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ error: 'Not liked' }, { status: 404 })
  }

  const updated = await prisma.recipe.update({
    where: { id },
    data: { likeCount: { decrement: 1 } },
    select: { likeCount: true },
  })

  const likeCount = Math.max(0, updated.likeCount)

  sseBus.publish(`recipe:${id}`, 'recipe:unliked', {
    recipeId: id,
    likeCount,
    userId,
  })

  return NextResponse.json({ likeCount, liked: false })
}
