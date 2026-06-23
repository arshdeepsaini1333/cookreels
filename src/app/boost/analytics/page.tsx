import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import BoostAnalyticsPage from '@/components/dashboard/BoostAnalyticsPage'

export const metadata = {
  title: 'Analytics | CookReels Boost',
}

export default async function AnalyticsRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <BoostAnalyticsPage />
    </DashboardLayout>
  )
}
