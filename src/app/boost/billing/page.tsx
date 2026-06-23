import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import BoostBillingPage from '@/components/dashboard/BoostBillingPage'

export const metadata = {
  title: 'Billing | CookReels Boost',
}

export default async function BillingRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <BoostBillingPage />
    </DashboardLayout>
  )
}
