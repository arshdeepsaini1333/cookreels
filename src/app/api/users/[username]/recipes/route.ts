import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ username: string }> }

export async function GET(req: Request, { params }: Params) {
  try {
    const { username } = await params
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, Number(searchParams.get('page')  ?? '1'))
    const limit = Math.min(18, Math.max(1, Number(searchParams.get('limit') ?? '9')))

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const where = { userId: user.id, isPublished: true }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id:         true,
          title:      true,
          coverImage: true,
          cookTime:   true,
          prepTime:   true,
          likeCount:  true,
          difficulty: true,
        },
      }),
      prisma.recipe.count({ where }),
    ])

    return NextResponse.json({
      recipes: recipes.map(r => ({
        id:         r.id,
        title:      r.title,
        coverImage: r.coverImage,
        cookTime:   r.cookTime,
        prepTime:   r.prepTime,
        likeCount:  r.likeCount,
        difficulty: r.difficulty as string | null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('[users/[username]/recipes GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
