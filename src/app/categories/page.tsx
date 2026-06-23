import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { CategoriesPage } from '@/components/dashboard/CategoriesPage'

export const metadata = {
  title: 'Recipe Categories | CookReels',
  description: 'Discover recipes and cooking reels across 21 curated categories.',
}

export default async function CategoriesRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <CategoriesPage username={session.username} />
    </DashboardLayout>
  )
}
