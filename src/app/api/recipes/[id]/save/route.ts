import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession()
  const { id } = await params

  const saved = session
    ? (await prisma.savedRecipe.count({ where: { userId: session.userId, recipeId: id } })) > 0
    : false

  return NextResponse.json({ saved })
}

export async function POST(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = session.userId

  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { id: true } })
  if (!recipe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await prisma.savedRecipe.create({ data: { userId, recipeId: id } })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ saved: true }, { status: 200 })
    }
    throw e
  }

  await prisma.recipe.update({
    where: { id },
    data: { savedCount: { increment: 1 } },
  })

  return NextResponse.json({ saved: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = session.userId

  const deleted = await prisma.savedRecipe.deleteMany({ where: { userId, recipeId: id } })

  if (deleted.count > 0) {
    await prisma.recipe.update({
      where: { id },
      data: { savedCount: { decrement: 1 } },
    })
  }

  return NextResponse.json({ saved: false })
}
