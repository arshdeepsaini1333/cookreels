import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { DashboardCards } from '@/components/dashboard/DashboardCards'

export default async function HomePage() {
  const session = await getSession()

  // Guests get the full homepage too — only account-requiring actions on it
  // are gated (via the shared AuthModal), not the page itself.
  let user = null
  if (session) {
    try {
      user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          isBanned: true,
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
    } catch {
      // DB temporarily unreachable — render page without stats
    }

    if (user?.isBanned) {
      redirect('/banned')
    }
  }

  const profileStats = user
    ? {
        posts:     user._count.reels + user._count.recipes,
        followers: user._count.followers,
        following: user._count.following,
      }
    : undefined

  return (
    <DashboardLayout username={session?.username} isAuthenticated={!!session}>
      <DashboardCards
        username={session?.username}
        userId={session?.userId}
        currentUserAvatar={user?.profileImage ?? null}
        profileStats={profileStats}
      />
    </DashboardLayout>
  )
}
