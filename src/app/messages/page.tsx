import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { MessagesPage } from '@/components/dashboard/MessagesPage'

export const metadata = { title: 'Messages | CookReels' }

export default async function MessagesRoute() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  return (
    <DashboardLayout username={session.username}>
      <MessagesPage currentUserId={session.userId} currentUsername={session.username} />
    </DashboardLayout>
  )
}
