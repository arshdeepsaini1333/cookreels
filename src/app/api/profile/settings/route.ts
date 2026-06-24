import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { hideLikeCount: true, blockComments: true, privateAccount: true },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const data: { hideLikeCount?: boolean; blockComments?: boolean; privateAccount?: boolean } = {}

  if (typeof body.hideLikeCount   === 'boolean') data.hideLikeCount   = body.hideLikeCount
  if (typeof body.blockComments   === 'boolean') data.blockComments   = body.blockComments
  if (typeof body.privateAccount  === 'boolean') data.privateAccount  = body.privateAccount

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where:  { id: session.userId },
    data,
    select: { hideLikeCount: true, blockComments: true, privateAccount: true },
  })

  return NextResponse.json(updated)
}
