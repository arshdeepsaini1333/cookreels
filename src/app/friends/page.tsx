import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { FriendsPage } from '@/components/dashboard/FriendsPage'

export default async function FriendsRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <FriendsPage username={session.username} />
    </DashboardLayout>
  )
}
