import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import BoostLeadsPage from '@/components/dashboard/BoostLeadsPage'

export const metadata = {
  title: 'Leads | CookReels Boost',
}

export default async function LeadsRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <BoostLeadsPage />
    </DashboardLayout>
  )
}
