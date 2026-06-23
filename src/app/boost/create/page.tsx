import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { BoostPage } from '@/components/dashboard/BoostPage'

export const metadata = {
  title: 'Create Campaign | Boost Center | CookReels',
  description: 'Create and launch promotional campaigns across multiple advertising networks.',
}

export default async function BoostCreateRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <BoostPage username={session.username} />
    </DashboardLayout>
  )
}
