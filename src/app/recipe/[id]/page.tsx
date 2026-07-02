import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { RecipeDeepLinkClient } from './RecipeDeepLinkClient'
import { PrivateProfileWall } from '@/components/shared/PrivateProfileWall'
import type { ProfileUser } from '@/components/profile/ProfilePage'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const recipe = await prisma.recipe.findUnique({
    where: { id, isPublished: true },
    select: {
      title:       true,
      description: true,
      coverImage:  true,
      user: { select: { username: true, firstName: true, lastName: true } },
    },
  })
  if (!recipe) return { title: 'Recipe not found | CookReels' }

  const title       = `${recipe.title} by @${recipe.user.username} | CookReels`
  const description = recipe.description
    ?? `Check out ${recipe.title} by @${recipe.user.username} on CookReels`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type:   'article',
      images: recipe.coverImage ? [{ url: recipe.coverImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      recipe.coverImage ? [recipe.coverImage] : [],
    },
    alternates: { canonical: `/recipe/${id}` },
  }
}

export default async function RecipePage({ params }: Props) {
  const { id }   = await params
  const session  = await getSession()

  const recipe = await prisma.recipe.findUnique({
    where: { id, isPublished: true },
    select: {
      id:          true,
      userId:      true,
      title:       true,
      coverImage:  true,
      cookTime:    true,
      prepTime:    true,
      difficulty:  true,
      description: true,
      servings:    true,
      likeCount:   true,
      createdAt:   true,
      user: {
        select: {
          id:             true,
          username:       true,
          firstName:      true,
          lastName:       true,
          profileImage:   true,
          isVerified:     true,
          bio:            true,
          privateAccount: true,
        },
      },
    },
  })

  if (!recipe) notFound()

  // ── Private account guard ──────────────────────────────────────────────────
  const isOwner = session?.userId === recipe.userId
  let canView   = !recipe.user.privateAccount || isOwner

  if (!canView && session) {
    const accepted = await prisma.follow.findFirst({
      where: { followerId: session.userId, followingId: recipe.userId, status: 'ACCEPTED' },
      select: { id: true },
    })
    canView = !!accepted
  }

  if (!canView) {
    return (
      <PrivateProfileWall
        creatorName={`${recipe.user.firstName} ${recipe.user.lastName}`.trim()}
        creatorUsername={recipe.user.username}
        creatorAvatar={recipe.user.profileImage}
        standalone={true}
      />
    )
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Fetch all published recipes from this creator so the carousel works.
  const userRecipes = await prisma.recipe.findMany({
    where:   { userId: recipe.userId, isPublished: true },
    orderBy: { createdAt: 'desc' },
    take:    60,
    select: {
      id:          true,
      title:       true,
      coverImage:  true,
      cookTime:    true,
      prepTime:    true,
      difficulty:  true,
      description: true,
      servings:    true,
      likeCount:   true,
      createdAt:   true,
    },
  })

  const initialIndex = Math.max(0, userRecipes.findIndex(r => r.id === id))

  const profileUser: ProfileUser = {
    id:               recipe.user.id,
    name:             `${recipe.user.firstName} ${recipe.user.lastName}`.trim(),
    username:         recipe.user.username,
    bio:              recipe.user.bio,
    verified:         recipe.user.isVerified,
    topChef:          false,
    level:            'Chef',
    avatar:           recipe.user.profileImage,
    cuisineSpecialty: null,
  }

  return (
    <RecipeDeepLinkClient
      recipes={userRecipes.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
      initialIndex={initialIndex}
      profileUser={profileUser}
      currentUserId={session?.userId}
      standalone={true}
    />
  )
}
