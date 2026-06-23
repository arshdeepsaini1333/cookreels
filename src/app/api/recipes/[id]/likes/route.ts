import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession()
  const { id } = await params

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { likeCount: true },
  })

  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const liked = session
    ? (await prisma.recipeLike.count({ where: { userId: session.userId, recipeId: id } })) > 0
    : false

  return NextResponse.json({ likeCount: recipe.likeCount, liked })
}
