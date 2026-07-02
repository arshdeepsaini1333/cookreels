import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { ReelDeepLinkClient } from './ReelDeepLinkClient'

type Props = { params: Promise<{ reelId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reelId } = await params
  const reel = await prisma.reel.findUnique({
    where: { id: reelId },
    select: {
      title:       true,
      thumbnailUrl: true,
      description: true,
      user: { select: { firstName: true, lastName: true, username: true } },
    },
  })
  if (!reel) return { title: 'Reel not found | CookReels' }

  const title       = `${reel.title} by @${reel.user.username} | CookReels`
  const description = reel.description ?? `Watch ${reel.title} by @${reel.user.username} on CookReels`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: reel.thumbnailUrl ? [{ url: reel.thumbnailUrl }] : [],
    },
    twitter: {
      card:   'summary_large_image',
      title,
      description,
      images: reel.thumbnailUrl ? [reel.thumbnailUrl] : [],
    },
    alternates: { canonical: `/reel/${reelId}` },
  }
}

export default async function ReelPage({ params }: Props) {
  const { reelId } = await params
  const session    = await getSession()

  const reel = await prisma.reel.findUnique({
    where: { id: reelId, isPublished: true },
    select: {
      id:     true,
      userId: true,
      user: {
        select: {
          id:            true,
          firstName:     true,
          lastName:      true,
          username:      true,
          profileImage:  true,
          isVerified:    true,
          hideLikeCount: true,
          blockComments: true,
          _count: { select: { recipes: { where: { isPublished: true } } } },
        },
      },
    },
  })

  if (!reel) notFound()

  // All published reels from this creator for vertical navigation
  const allReels = await prisma.reel.findMany({
    where:   { userId: reel.userId, isPublished: true },
    orderBy: { createdAt: 'desc' },
    take:    60,
    select: {
      id:           true,
      title:        true,
      description:  true,
      videoUrl:     true,
      thumbnailUrl: true,
      duration:     true,
      likeCount:    true,
      commentCount: true,
      viewCount:    true,
    },
  })

  if (allReels.length === 0) notFound()

  const [isFollowing, currentUser] = await Promise.all([
    session
      ? prisma.follow.findFirst({
          where:  { followerId: session.userId, followingId: reel.userId },
          select: { id: true },
        }).then(Boolean)
      : Promise.resolve(false),
    session
      ? prisma.user.findUnique({
          where:  { id: session.userId },
          select: { firstName: true, lastName: true, profileImage: true },
        })
      : Promise.resolve(null),
  ])

  return (
    <ReelDeepLinkClient
      initialReelId={reelId}
      allReels={allReels}
      creator={{
        id:       reel.user.id,
        name:     `${reel.user.firstName} ${reel.user.lastName}`,
        username: `@${reel.user.username}`,
        avatar:   reel.user.profileImage,
        verified: reel.user.isVerified,
        topChef:  reel.user._count.recipes >= 10,
      }}
      hideLikeCount={reel.user.hideLikeCount}
      blockComments={reel.user.blockComments}
      currentUserId={session?.userId ?? null}
      currentUserAvatar={currentUser?.profileImage ?? null}
      currentUserName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : undefined}
      initialIsFollowing={isFollowing}
      isOwnReel={session?.userId === reel.userId}
      standalone={true}
    />
  )
}
