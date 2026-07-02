import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { RecipeDeepLinkClient } from '@/app/recipe/[id]/RecipeDeepLinkClient'
import { PrivateProfileWall } from '@/components/shared/PrivateProfileWall'
import type { ProfileUser } from '@/components/profile/ProfilePage'

type Props = { params: Promise<{ id: string }> }

export default async function RecipeModalPage({ params }: Props) {
  const { id }  = await params
  const session = await getSession()

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
        standalone={false}
      />
    )
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Pre-fetch this creator's recipes so the carousel works without a client-side round-trip.
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
      standalone={false}
    />
  )
}
