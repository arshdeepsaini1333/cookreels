import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { fetchReelsFeed, fetchReelsFeedCursor } from '@/lib/reelsFeed'

// User-specific feed — must not be shared-cached by CDN or browser.
const CACHE_HEADERS = { 'Cache-Control': 'private, no-store' }

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') ?? '5', 10)))
  const cursor = searchParams.get('cursor')

  try {
    // Cursor-based path: used for all client-side pagination after the first page.
    // cursor='' (empty string) is treated the same as absent — start from beginning.
    if (cursor !== null) {
      const result = await fetchReelsFeedCursor(session.userId, cursor || null, limit)
      return NextResponse.json(result, { headers: CACHE_HEADERS })
    }

    // Offset-based path: retained for the initial SSR hand-off and any legacy callers.
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const result = await fetchReelsFeed(session.userId, page, limit)
    return NextResponse.json(result, { headers: CACHE_HEADERS })
  } catch (err) {
    console.error('[/api/reels/feed]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
