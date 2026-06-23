import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import BoostLandingPage from '@/components/dashboard/BoostLandingPage'

export const metadata = {
  title: 'Advertise | CookReels',
  description: 'Reach food lovers with CookReels Boost and precision Geofencing campaigns. Promote your restaurant, café, bakery, food brand or kitchen products.',
}

export default async function BoostRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <BoostLandingPage />
    </DashboardLayout>
  )
}
