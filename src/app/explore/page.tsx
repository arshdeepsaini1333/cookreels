import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { ExplorePage } from '@/components/dashboard/ExplorePage'

export default async function ExploreRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <ExplorePage username={session.username} currentUserId={session.userId} />
    </DashboardLayout>
  )
}
