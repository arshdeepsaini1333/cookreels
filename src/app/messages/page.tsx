import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { MessagesPage } from '@/components/dashboard/MessagesPage'

export const metadata = { title: 'Messages | CookReels' }

export default async function MessagesRoute({
  searchParams,
}: {
  searchParams: Promise<{ conv?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  const { conv } = await searchParams

  return (
    <DashboardLayout username={session.username}>
      <MessagesPage
        currentUserId={session.userId}
        currentUsername={session.username}
        openConvId={conv ?? null}
      />
    </DashboardLayout>
  )
}
