import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ convId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { convId } = await params
  const { action } = (await req.json()) as { action: 'accept' | 'decline' }

  const conv = await prisma.conversation.findFirst({
    where: {
      id: convId,
      OR: [{ user1Id: session.userId }, { user2Id: session.userId }],
      status: 'PENDING',
    },
    select: { id: true, requestedById: true },
  })

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only the recipient (not the requester) can accept/decline
  if (conv.requestedById === session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action === 'accept') {
    await prisma.conversation.update({
      where: { id: convId },
      data: { status: 'OPEN', acceptedAt: new Date() },
    })
    return NextResponse.json({ status: 'OPEN' })
  }

  if (action === 'decline') {
    await prisma.conversation.update({
      where: { id: convId },
      data: { status: 'DECLINED', declinedAt: new Date() },
    })
    return NextResponse.json({ status: 'DECLINED' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
