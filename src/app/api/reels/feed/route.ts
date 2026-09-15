import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { fetchReelsFeed, fetchReelsFeedCursor } from '@/lib/reelsFeed'

// User-specific feed — must not be shared-cached by CDN or browser.
const CACHE_HEADERS = { 'Cache-Control': 'private, no-store' }

export async function GET(req: Request) {
  // Public read — the reels feed is browsable by guests too. '' is a safe
  // sentinel for a logged-out viewer (see fetchReelsFeed/fetchReelsFeedCursor):
  // it can never match a real user id, so personalization/exclusion joins
  // just become no-ops.
  const session = await getSession()
  const userId = session?.userId ?? ''

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(10, Math.max(1, parseInt(searchParams.get('limit') ?? '5', 10)))
  const cursor = searchParams.get('cursor')

  try {
    // Cursor-based path: used for all client-side pagination after the first page.
    // cursor='' (empty string) is treated the same as absent — start from beginning.
    if (cursor !== null) {
      const result = await fetchReelsFeedCursor(userId, cursor || null, limit)
      return NextResponse.json(result, { headers: CACHE_HEADERS })
    }

    // Offset-based path: retained for the initial SSR hand-off and any legacy callers.
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const result = await fetchReelsFeed(userId, page, limit)
    return NextResponse.json(result, { headers: CACHE_HEADERS })
  } catch (err) {
    console.error('[/api/reels/feed]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
