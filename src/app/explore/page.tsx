import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { ExplorePage } from '@/components/dashboard/ExplorePage'

export default async function ExploreRoute() {
  const session = await getSession()

  return (
    <DashboardLayout username={session?.username} isAuthenticated={!!session}>
      <ExplorePage username={session?.username} currentUserId={session?.userId} />
    </DashboardLayout>
  )
}
