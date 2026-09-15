import { redirect } from 'next/navigation'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// Old URL — kept as a redirect to the canonical /login so existing links/bookmarks still work.
export default async function LegacyLoginRedirect({ searchParams }: Props) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value)
  }
  const qs = params.toString()
  redirect(`/login${qs ? `?${qs}` : ''}`)
}
