import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { CategoriesPage } from '@/components/dashboard/CategoriesPage'

export const metadata = {
  title: 'Recipe Categories | CookReels',
  description: 'Discover recipes and cooking reels across 21 curated categories.',
}

export default async function CategoriesRoute() {
  const session = await getSession()

  return (
    <DashboardLayout username={session?.username} isAuthenticated={!!session}>
      <CategoriesPage username={session?.username} userId={session?.userId} />
    </DashboardLayout>
  )
}
