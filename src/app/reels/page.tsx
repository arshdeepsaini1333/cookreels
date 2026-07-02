import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { ReelsPage } from '@/components/reels/ReelsPage'
import { fetchReelsFeed, fetchReelById, type FeedReel } from '@/lib/reelsFeed'

export const metadata = { title: 'Reels | CookReels' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reelId?: string }>
}) {
  const session = await getSession()
  const { reelId } = await searchParams

  if (!session) {
    redirect(reelId ? `/reel/${reelId}` : '/auth/login')
  }

  let initialReels: FeedReel[] = []
  let initialHasMore = true
  let initialCursor: string | null = null
  try {
    const data = await fetchReelsFeed(session.userId, 1, 5)
    initialReels  = data.reels
    initialHasMore = data.hasMore
    initialCursor  = data.nextCursor
  } catch { /* fallback: client will fetch */ }

  // If a specific reel was requested (e.g. from trending bar), make it play first.
  if (reelId) {
    try {
      const target = await fetchReelById(session.userId, reelId)
      if (target) {
        // Remove the reel if it already appears in the feed, then prepend it.
        initialReels = [target, ...initialReels.filter(r => r.id !== reelId)]
      }
    } catch { /* ignore — fall through to normal feed */ }
  }

  return (
    <DashboardLayout username={session.username}>
      <ReelsPage
        initialReels={initialReels}
        initialHasMore={initialHasMore}
        initialCursor={initialCursor}
        currentUserId={session.userId}
      />
    </DashboardLayout>
  )
}
