import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getBlockRelation } from '@/lib/blocks'
import { PublicProfilePage } from '@/components/profile/PublicProfilePage'
import { ProfilePage } from '@/components/profile/ProfilePage'
import { BlockedProfileNotice } from '@/components/profile/BlockedProfileNotice'

type Props = {
  params: Promise<{ username: string }>
}

const fetchUser = cache(async (username: string) => {
  try {
    return await prisma.user.findUnique({
      where: { username },
    select: {
      id:                true,
      firstName:         true,
      lastName:          true,
      username:          true,
      bio:               true,
      profileImage:      true,
      backgroundPicture: true,
      cuisineSpecialty:  true,
      level:             true,
      isVerified:        true,
      privateAccount:    true,
      _count: {
        select: {
          recipes:   { where: { isPublished: true } },
          reels:     { where: { isPublished: true } },
          followers: { where: { status: 'ACCEPTED' } },
          following: { where: { status: 'ACCEPTED' } },
        },
      },
      recipes: {
        where:   { isPublished: true },
        orderBy: { createdAt: 'desc' },
        take:    9,
        select: {
          id:         true,
          title:      true,
          coverImage: true,
          cookTime:   true,
          prepTime:   true,
          likeCount:  true,
          difficulty: true,
        },
      },
      reels: {
        where:   { isPublished: true },
        orderBy: { createdAt: 'desc' },
        take:    12,
        select: {
          id:           true,
          title:        true,
          videoUrl:     true,
          thumbnailUrl: true,
          duration:     true,
          viewCount:    true,
          likeCount:    true,
        },
      },
    },
  })
  } catch {
    return null
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await fetchUser(username)

  if (!user) {
    return { title: 'User not found | CookReels' }
  }

  const fullName    = `${user.firstName} ${user.lastName}`
  const title       = `${fullName} (@${username}) | CookReels`
  const description = user.bio ?? `View ${fullName}'s recipes and cooking reels on CookReels.`

  return {
    title,
    description,
    openGraph: {
      type:        'profile',
      title,
      description,
      url:         `/user/${username}`,
      images:      user.profileImage ? [{ url: user.profileImage }] : [],
      firstName:   user.firstName,
      lastName:    user.lastName,
      username,
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      user.profileImage ? [user.profileImage] : [],
    },
    alternates: {
      canonical: `/user/${username}`,
    },
  }
}

export default async function Page({ params }: Props) {
  const { username } = await params
  const [user, session] = await Promise.all([fetchUser(username), getSession()])

  if (!user) notFound()

  const blockRelation = await getBlockRelation(session?.userId, user.id)

  // Profile owner has blocked the viewer — treat the link as unreachable,
  // Instagram-style, without revealing that a block is the reason.
  if (blockRelation.blockedViewer) {
    return <BlockedProfileNotice />
  }

  // ── Own profile ────────────────────────────────────────────────────────────
  if (session?.userId === user.id) {
    let fullUser = null, friendsCount = 0
    try {
      ;[fullUser, friendsCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          firstName: true,
          lastName:  true,
          username:  true,
          bio:       true,
          profileImage:      true,
          backgroundPicture: true,
          cuisineSpecialty:  true,
          level:     true,
          isVerified: true,
          password:  true,
          _count: {
            select: {
              recipes:   { where: { isPublished: true } },
              reels:     { where: { isPublished: true } },
              followers: true,
              following: true,
            },
          },
          recipes: {
            where:   { isPublished: true },
            orderBy: { createdAt: 'desc' },
            take:    9,
            select: {
              id:         true,
              title:      true,
              coverImage: true,
              cookTime:   true,
              prepTime:   true,
              likeCount:  true,
              difficulty: true,
            },
          },
          reels: {
            where:   { isPublished: true },
            orderBy: { createdAt: 'desc' },
            take:    12,
            select: {
              id:           true,
              title:        true,
              videoUrl:     true,
              thumbnailUrl: true,
              duration:     true,
              viewCount:    true,
              likeCount:    true,
            },
          },
          collections: {
            orderBy: { createdAt: 'desc' },
            take:    4,
            select: {
              id:   true,
              name: true,
              savedRecipes: {
                take:   4,
                select: {
                  recipe: { select: { coverImage: true } },
                },
              },
              _count: {
                select: {
                  savedRecipes: true,
                  savedReels:   true,
                },
              },
            },
          },
        },
      }),
      // Mutual-follow count: people user.id follows who also follow back
      prisma.follow.count({
        where: {
          followerId: user.id,
          following: { following: { some: { followingId: user.id } } },
        },
      }),
    ])
    } catch {
      notFound()
    }

    if (!fullUser) notFound()

    return (
      <ProfilePage
        user={{
          id:                user.id,
          name:              `${fullUser.firstName} ${fullUser.lastName}`,
          username:          `@${fullUser.username}`,
          bio:               fullUser.bio,
          verified:          fullUser.isVerified,
          topChef:           fullUser._count.recipes >= 10,
          level:             fullUser.level ?? 'Home Chef',
          avatar:            fullUser.profileImage,
          backgroundPicture: fullUser.backgroundPicture,
          cuisineSpecialty:  fullUser.cuisineSpecialty,
          hasPassword:       fullUser.password !== null,
        }}
        stats={{
          recipes:   fullUser._count.recipes,
          reels:     fullUser._count.reels,
          followers: fullUser._count.followers,
          following: fullUser._count.following,
          friends:   friendsCount,
        }}
        recipes={fullUser.recipes.map(r => ({
          id:         r.id,
          title:      r.title,
          coverImage: r.coverImage,
          cookTime:   r.cookTime,
          prepTime:   r.prepTime,
          likeCount:  r.likeCount,
          difficulty: r.difficulty,
        }))}
        reels={fullUser.reels.map(r => ({
          id:           r.id,
          title:        r.title,
          videoUrl:     r.videoUrl,
          thumbnailUrl: r.thumbnailUrl,
          duration:     r.duration,
          viewCount:    r.viewCount,
          likeCount:    r.likeCount,
        }))}
        collections={fullUser.collections.map(c => ({
          id:            c.id,
          name:          c.name,
          itemCount:     c._count.savedRecipes + c._count.savedReels,
          previewImages: c.savedRecipes
            .map(sr => sr.recipe.coverImage)
            .filter((img): img is string => img !== null),
        }))}
      />
    )
  }

  // ── Public profile ─────────────────────────────────────────────────────────
  let friendsCount = 0
  let followRelation: readonly [{ id: string; status: string } | null, { id: string } | null] = [null, null]
  let currentViewer: { firstName: string } | null = null
  try {
    ;[friendsCount, followRelation, currentViewer] = await Promise.all([
      prisma.user.count({
        where: {
          AND: [
            { followers: { some: { followerId:  user.id } } },
            { following: { some: { followingId: user.id } } },
          ],
        },
      }),
      session
        ? Promise.all([
            prisma.follow.findFirst({
              where: { followerId: session.userId, followingId: user.id },
              select: { id: true, status: true },
            }),
            prisma.follow.findFirst({
              where: { followerId: user.id, followingId: session.userId, status: 'ACCEPTED' },
              select: { id: true },
            }),
          ])
        : Promise.resolve([null, null] as const),
      session
        ? prisma.user.findUnique({
            where:  { id: session.userId },
            select: { firstName: true },
          })
        : Promise.resolve(null),
    ])
  } catch {
    // DB temporarily unreachable — render page with default/empty social state
  }

  const [fwdRecord, revRecord] = followRelation
  const followStatus: 'none' | 'pending' | 'accepted' = !fwdRecord
    ? 'none'
    : fwdRecord.status === 'PENDING' ? 'pending' : 'accepted'
  const isFollowedBy = !!revRecord

  // Hide content from private accounts unless viewer is an accepted follower or the owner.
  // Also hide content once the viewer has blocked this account — they've chosen not to see it.
  const canSeeContent = (!user.privateAccount || followStatus === 'accepted') && !blockRelation.blockedByViewer

  return (
    <PublicProfilePage
      user={{
        id:                user.id,
        name:              `${user.firstName} ${user.lastName}`,
        username:          `@${user.username}`,
        bio:               user.bio,
        verified:          user.isVerified,
        topChef:           user._count.recipes >= 10,
        level:             user.level ?? 'Home Chef',
        avatar:            user.profileImage,
        backgroundPicture: user.backgroundPicture,
        cuisineSpecialty:  user.cuisineSpecialty,
      }}
      stats={{
        recipes:   user._count.recipes,
        reels:     user._count.reels,
        followers: user._count.followers,
        following: user._count.following,
        friends:   friendsCount,
      }}
      initialRecipes={canSeeContent ? user.recipes.map(r => ({
        id:         r.id,
        title:      r.title,
        coverImage: r.coverImage,
        cookTime:   r.cookTime,
        prepTime:   r.prepTime,
        likeCount:  r.likeCount,
        difficulty: r.difficulty as string | null,
      })) : []}
      initialReels={canSeeContent ? user.reels.map(r => ({
        id:           r.id,
        title:        r.title,
        videoUrl:     r.videoUrl,
        thumbnailUrl: r.thumbnailUrl,
        duration:     r.duration,
        viewCount:    r.viewCount,
        likeCount:    r.likeCount,
      })) : []}
      totalRecipes={user._count.recipes}
      totalReels={user._count.reels}
      currentUserId={session?.userId ?? null}
      currentUserName={currentViewer?.firstName ?? 'Chef'}
      initialFollowStatus={followStatus}
      initialIsFollowedBy={isFollowedBy}
      isPrivate={user.privateAccount}
      initialIsBlockedByViewer={blockRelation.blockedByViewer}
    />
  )
}
