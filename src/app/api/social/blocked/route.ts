import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

// GET /api/social/blocked — users the current session user has blocked
export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page   = Math.max(1, Number(searchParams.get('page')  ?? '1'))
    const limit  = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')))
    const search = (searchParams.get('search') ?? '').trim()

    const userId = session.userId

    const searchFilter = search ? {
      blocked: {
        OR: [
          { username:  { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName:  { contains: search, mode: 'insensitive' as const } },
        ],
      },
    } : {}

    const where = { blockerId: userId, ...searchFilter }

    const [blockRecords, total] = await Promise.all([
      prisma.block.findMany({
        where,
        include: {
          blocked: {
            select: {
              id: true, firstName: true, lastName: true, username: true,
              profileImage: true, isVerified: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.block.count({ where }),
    ])

    return NextResponse.json({
      users: blockRecords.map(b => ({
        id:           b.blocked.id,
        firstName:    b.blocked.firstName,
        lastName:     b.blocked.lastName,
        username:     b.blocked.username,
        profileImage: b.blocked.profileImage,
        isVerified:   b.blocked.isVerified,
        blockedAt:    b.createdAt.toISOString(),
      })),
      total, page, totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[social/blocked GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
