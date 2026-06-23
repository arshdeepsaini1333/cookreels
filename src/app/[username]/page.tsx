import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ username: string }>
}

export default async function Page({ params }: Props) {
  const { username } = await params
  redirect(`/user/${username}`)
}
