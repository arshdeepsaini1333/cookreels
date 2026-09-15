import { getSession } from '@/lib/session'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { MessagesPage } from '@/components/dashboard/MessagesPage'
import { GuestCallout } from '@/components/shared/GuestCallout'

export const metadata = { title: 'Messages | CookReels' }

export default async function MessagesRoute({
  searchParams,
}: {
  searchParams: Promise<{ conv?: string }>
}) {
  const session = await getSession()

  if (!session) {
    return (
      <DashboardLayout isAuthenticated={false}>
        <GuestCallout
          icon="messages"
          title="Login to start messaging"
          message="Create an account or login to chat with other CookReels users."
        />
      </DashboardLayout>
    )
  }

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
