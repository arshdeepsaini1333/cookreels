import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { ReelsPage } from '@/components/reels/ReelsPage'
import { fetchReelsFeed, type FeedReel } from '@/lib/reelsFeed'

export const metadata = { title: 'Reels | CookReels' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reelId?: string }>
}) {
  const { reelId } = await searchParams

  // A shared/bookmarked link to a specific reel (e.g. /reels?reelId=X, the URL the
  // feed itself writes via replaceState while scrolling) should open the focused
  // single-reel popup view, not the full immersive feed — for guests and signed-in
  // users alike. /reel/[reelId] already handles both cases on its own.
  if (reelId) redirect(`/reel/${reelId}`)

  const session = await getSession()

  let initialReels: FeedReel[] = []
  let initialHasMore = true
  let initialCursor: string | null = null
  try {
    // '' is a safe sentinel for guests: it can never match a real user id, so
    // the feed's own-content/follow/block/report filters just become no-ops.
    const data = await fetchReelsFeed(session?.userId ?? '', 1, 5)
    initialReels  = data.reels
    initialHasMore = data.hasMore
    initialCursor  = data.nextCursor
  } catch { /* fallback: client will fetch */ }

  return (
    <DashboardLayout username={session?.username} isAuthenticated={!!session}>
      <ReelsPage
        initialReels={initialReels}
        initialHasMore={initialHasMore}
        initialCursor={initialCursor}
        currentUserId={session?.userId}
      />
    </DashboardLayout>
  )
}
