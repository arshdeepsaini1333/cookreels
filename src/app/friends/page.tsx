import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { FriendsPage } from '@/components/dashboard/FriendsPage'
import { GuestCallout } from '@/components/shared/GuestCallout'

export default async function FriendsRoute() {
  const session = await getSession()

  if (!session) {
    return (
      <DashboardLayout isAuthenticated={false}>
        <GuestCallout
          icon="friends"
          title="Connect with people on CookReels"
          message="Login or sign up to see your friends, follow people, and build your food community."
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout username={session.username}>
      <FriendsPage username={session.username} />
    </DashboardLayout>
  )
}
