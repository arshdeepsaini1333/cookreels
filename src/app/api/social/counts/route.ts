import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const userId = session.userId

    const [followersCount, followingCount, friendsCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      // Friends = mutual follows
      prisma.user.count({
        where: {
          AND: [
            { followers: { some: { followerId:  userId } } },
            { following: { some: { followingId: userId } } },
          ],
        },
      }),
    ])

    return NextResponse.json({ followersCount, followingCount, friendsCount })
  } catch (error) {
    console.error('[counts GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
