import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getBlockRelation, getBlockedUserIds } from '@/lib/blocks'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const session = await getSession()
    const blockedCommenterIds = session ? await getBlockedUserIds(session.userId) : []

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      select: {
        id:           true,
        title:        true,
        coverImage:   true,
        cookTime:     true,
        prepTime:     true,
        difficulty:   true,
        description:  true,
        servings:     true,
        commentCount: true,
        likeCount:    true,
        createdAt:    true,
        user: {
          select: {
            id:             true,
            username:       true,
            firstName:      true,
            lastName:       true,
            profileImage:   true,
            isVerified:     true,
            hideLikeCount:  true,
            blockComments:  true,
            privateAccount: true,
            bio:            true,
            _count: { select: { recipes: { where: { isPublished: true } } } },
          },
        },
        comments: {
          where: {
            parentId: null,
            ...(blockedCommenterIds.length > 0 ? { userId: { notIn: blockedCommenterIds } } : {}),
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id:        true,
            content:   true,
            likeCount: true,
            createdAt: true,
            user: {
              select: { username: true, profileImage: true },
            },
          },
        },
      },
    })

    if (!recipe) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    // Private account guard
    const isOwner = session?.userId === recipe.user.id
    let canView   = !recipe.user.privateAccount || isOwner
    if (!canView && session) {
      const accepted = await prisma.follow.findFirst({
        where: { followerId: session.userId, followingId: recipe.user.id, status: 'ACCEPTED' },
        select: { id: true },
      })
      canView = !!accepted
    }
    if (!isOwner) {
      const { blockedByViewer, blockedViewer } = await getBlockRelation(session?.userId, recipe.user.id)
      if (blockedByViewer || blockedViewer) canView = false
    }
    if (!canView) {
      return NextResponse.json(
        { message: 'This account is private', privateAccount: true },
        { status: 403 }
      )
    }

    const liked = session
      ? (await prisma.recipeLike.count({ where: { userId: session.userId, recipeId: id } })) > 0
      : false

    return NextResponse.json({
      id:            recipe.id,
      title:         recipe.title,
      coverImage:    recipe.coverImage,
      cookTime:      recipe.cookTime,
      prepTime:      recipe.prepTime,
      difficulty:    recipe.difficulty,
      description:   recipe.description,
      servings:      recipe.servings,
      commentCount:  recipe.commentCount,
      likeCount:     recipe.likeCount,
      hideLikeCount: recipe.user.hideLikeCount,
      blockComments: recipe.user.blockComments,
      liked,
      createdAt:     recipe.createdAt.toISOString(),
      user: {
        id:           recipe.user.id,
        username:     recipe.user.username,
        firstName:    recipe.user.firstName,
        lastName:     recipe.user.lastName,
        profileImage: recipe.user.profileImage,
        isVerified:   recipe.user.isVerified,
        bio:          recipe.user.bio,
        topChef:      recipe.user._count.recipes >= 10,
      },
      comments: recipe.comments.map(c => ({
        id:        c.id,
        username:  c.user.username,
        userAvatar: c.user.profileImage,
        text:      c.content,
        createdAt: c.createdAt.toISOString(),
        likeCount: c.likeCount,
      })),
    })
  } catch (error) {
    console.error('[recipes/[id] GET]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const recipe = await prisma.recipe.findUnique({ where: { id }, select: { userId: true } })
    if (!recipe) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    if (recipe.userId !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data: Record<string, unknown> = {}

    if (typeof body.title === 'string') data.title = body.title.trim()
    if (typeof body.description === 'string') data.description = body.description.trim()
    if (typeof body.cuisine === 'string') data.cuisine = body.cuisine
    if (body.cookTime !== undefined) data.cookTime = body.cookTime ? Number(body.cookTime) : null
    if (body.prepTime !== undefined) data.prepTime = body.prepTime ? Number(body.prepTime) : null
    if (body.servings !== undefined) data.servings = body.servings ? Number(body.servings) : null
    if (typeof body.difficulty === 'string') data.difficulty = body.difficulty
    if (typeof body.isVeg === 'boolean') data.isVeg = body.isVeg
    if (typeof body.isPublished === 'boolean') data.isPublished = body.isPublished

    const updated = await prisma.recipe.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[recipes/[id] PATCH]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const recipe = await prisma.recipe.findUnique({ where: { id }, select: { userId: true } })
    if (!recipe) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    if (recipe.userId !== session.userId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    await prisma.recipe.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[recipes/[id] DELETE]', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
