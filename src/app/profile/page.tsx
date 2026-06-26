import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export default async function Page() {
  const session = await getSession()
  if (!session) redirect('/auth/login')

  let user = null
  try {
    user = await prisma.user.findUnique({
      where:  { id: session.userId },
      select: { username: true },
    })
  } catch {
    redirect('/auth/login')
  }

  if (!user) redirect('/auth/login')

  redirect(`/user/${user.username}`)
}
