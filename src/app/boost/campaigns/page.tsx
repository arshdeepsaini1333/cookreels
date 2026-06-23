import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import BoostCampaignsPage from '@/components/dashboard/BoostCampaignsPage'

export const metadata = {
  title: 'My Campaigns | CookReels Boost',
}

export default async function CampaignsRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <BoostCampaignsPage />
    </DashboardLayout>
  )
}
