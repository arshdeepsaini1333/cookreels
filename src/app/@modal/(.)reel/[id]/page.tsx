import { notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { ReelDeepLinkClient } from '@/app/reel/[reelId]/ReelDeepLinkClient'

type Props = { params: Promise<{ id: string }> }

export default async function ReelModalPage({ params }: Props) {
  const { id }  = await params
  const session = await getSession()

  const reel = await prisma.reel.findUnique({
    where: { id, isPublished: true },
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
      initialReelId={id}
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
    />
  )
}
