import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const CACHE_HEADERS = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      profileImage: true,
      isVerified: true,
      cuisineSpecialty: true,
      _count: { select: { recipes: true, reels: true } },
    },
  })

  const top = users
    .map(u => ({ ...u, postCount: u._count.recipes + u._count.reels }))
    .filter(u => u.postCount > 0)
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 10)
    .map(({ _count, ...u }) => u)

  return NextResponse.json({ creators: top }, { headers: CACHE_HEADERS })
}
