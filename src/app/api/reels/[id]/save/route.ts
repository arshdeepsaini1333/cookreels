import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession()
  const { id } = await params

  const saved = session
    ? (await prisma.savedReel.count({ where: { userId: session.userId, reelId: id } })) > 0
    : false

  return NextResponse.json({ saved })
}

export async function POST(_req: Request, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = session.userId

  const reel = await prisma.reel.findUnique({ where: { id }, select: { id: true } })
  if (!reel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await prisma.savedReel.create({ data: { userId, reelId: id } })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ saved: true }, { status: 200 })
    }
    throw e
  }

  await prisma.reel.update({
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

  const deleted = await prisma.savedReel.deleteMany({ where: { userId, reelId: id } })

  if (deleted.count > 0) {
    await prisma.reel.update({
      where: { id },
      data: { savedCount: { decrement: 1 } },
    })
  }

  return NextResponse.json({ saved: false })
}
