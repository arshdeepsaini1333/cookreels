import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await getSession()
  const { id } = await params

  const reel = await prisma.reel.findUnique({
    where: { id },
    select: { likeCount: true },
  })

  if (!reel) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const liked = session
    ? (await prisma.reelLike.count({ where: { userId: session.userId, reelId: id } })) > 0
    : false

  return NextResponse.json({ likeCount: reel.likeCount, liked })
}
