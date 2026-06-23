import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { DashboardCards } from '@/components/dashboard/DashboardCards'

export default async function HomePage() {
  const session = await getSession()

  if (!session) {
    redirect('/auth/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      profileImage: true,
      _count: {
        select: {
          recipes: { where: { isPublished: true } },
          reels:   { where: { isPublished: true } },
          followers: true,
          following: true,
        },
      },
    },
  })

  const profileStats = user
    ? {
        posts:     user._count.reels + user._count.recipes,
        followers: user._count.followers,
        following: user._count.following,
      }
    : undefined

  return (
    <DashboardLayout username={session.username}>
      <DashboardCards
        username={session.username}
        userId={session.userId}
        currentUserAvatar={user?.profileImage ?? null}
        profileStats={profileStats}
      />
    </DashboardLayout>
  )
}
