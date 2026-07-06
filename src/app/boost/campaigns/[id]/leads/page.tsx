import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import BoostCampaignLeadsPage from '@/components/dashboard/BoostCampaignLeadsPage'

export const metadata = {
  title: 'Campaign Leads | CookReels Boost',
}

type Params = { params: Promise<{ id: string }> }

export default async function CampaignLeadsRoute({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  const { id } = await params

  return (
    <DashboardLayout username={session.username}>
      <BoostCampaignLeadsPage campaignId={id} />
    </DashboardLayout>
  )
}
