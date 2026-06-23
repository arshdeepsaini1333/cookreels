import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ username: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { username } = await params

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Tagged content system is not yet implemented — return empty list
    return NextResponse.json({
      tagged:     [],
      total:      0,
      page:       1,
      totalPages: 0,
    })
  } catch (error) {
    console.error('[users/[username]/tagged GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
