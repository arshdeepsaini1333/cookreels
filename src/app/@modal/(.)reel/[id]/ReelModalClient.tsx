'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { InstagramReelViewer } from '@/components/reels/InstagramReelViewer'
import type { InstagramReelViewerProps, ViewerReel, ViewerCreator } from '@/components/reels/InstagramReelViewer'

type ReelModalClientProps = InstagramReelViewerProps

interface CtxItem {
  reel: ViewerReel
  creator: ViewerCreator
  isFollowing: boolean
  isOwnReel: boolean
  hideLikeCount: boolean
  blockComments: boolean
}

async function fetchCtxItem(id: string): Promise<CtxItem | null> {
  try {
    const res = await fetch(`/api/reels/${id}`)
    if (!res.ok) return null
    const d = await res.json()
    return {
      reel: {
        id:           d.id,
        title:        d.title,
        description:  d.description,
        videoUrl:     d.videoUrl,
        thumbnailUrl: d.thumbnailUrl,
        duration:     d.duration,
        likeCount:    d.likeCount,
        commentCount: d.commentCount,
        viewCount:    d.viewCount,
      },
      creator: {
        id:       d.user.id,
        name:     `${d.user.firstName} ${d.user.lastName}`,
        username: `@${d.user.username}`,
        avatar:   d.user.profileImage,
        verified: d.user.isVerified,
        topChef:  !!d.user.topChef,
      },
      isFollowing:   !!d.isFollowing,
      isOwnReel:     !!d.isOwner,
      hideLikeCount: !!d.hideLikeCount,
      blockComments: !!d.blockComments,
    }
  } catch {
    return null
  }
}

export function ReelModalClient(props: ReelModalClientProps) {
  const router = useRouter()

  // Read nav context from sessionStorage immediately (synchronous, no flash)
  const [ctxIds] = useState<string[] | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('__cr_nav_ctx')
      if (raw) {
        const ctx = JSON.parse(raw)
        if (ctx.type === 'reel' && Array.isArray(ctx.ids) && ctx.ids.length > 0) {
          return ctx.ids as string[]
        }
      }
    } catch {}
    return null
  })

  const initialCtxIdx = ctxIds ? ctxIds.indexOf(props.initialReelId) : -1
  const inCtxMode     = ctxIds !== null && initialCtxIdx !== -1

  // ── Context navigation: purely local state, no Next.js route navigation ───
  // (a route navigation would remount this whole tree, killing the slide animation)
  const [ctxIdx,  setCtxIdx]  = useState(initialCtxIdx)
  const [ctxItem, setCtxItem] = useState<CtxItem | null>(() => {
    if (!inCtxMode) return null
    const initialReel = props.allReels.find(r => r.id === props.initialReelId)
    if (!initialReel) return null
    return {
      reel:          initialReel,
      creator:       props.creator,
      isFollowing:   props.initialIsFollowing,
      isOwnReel:     props.isOwnReel,
      hideLikeCount: !!props.hideLikeCount,
      blockComments: !!props.blockComments,
    }
  })

  const cacheRef = useRef<Map<string, CtxItem>>(new Map())
  useEffect(() => {
    if (inCtxMode && ctxItem) {
      cacheRef.current.set(props.initialReelId, ctxItem)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prefetch = useCallback((id: string | undefined) => {
    if (!id || cacheRef.current.has(id)) return
    fetchCtxItem(id).then(item => { if (item) cacheRef.current.set(id, item) })
  }, [])

  // Prefetch neighbors so navigation feels instant once the user clicks.
  useEffect(() => {
    if (!inCtxMode || !ctxIds) return
    prefetch(ctxIds[ctxIdx - 1])
    prefetch(ctxIds[ctxIdx + 1])
  }, [inCtxMode, ctxIds, ctxIdx, prefetch])

  const goToCtx = useCallback(async (targetIdx: number) => {
    if (!ctxIds) return
    const id = ctxIds[targetIdx]
    if (!id) return
    let item = cacheRef.current.get(id)
    if (!item) {
      const fetched = await fetchCtxItem(id)
      if (!fetched) return
      cacheRef.current.set(id, fetched)
      item = fetched
    }
    setCtxIdx(targetIdx)
    setCtxItem(item)
    window.history.replaceState(null, '', `/reel/${id}`)
  }, [ctxIds])

  const ctxHasPrev = inCtxMode && ctxIdx > 0
  const ctxHasNext = inCtxMode && ctxIds !== null && ctxIdx < ctxIds.length - 1

  const onCtxPrev = useCallback(() => { goToCtx(ctxIdx - 1) }, [goToCtx, ctxIdx])
  const onCtxNext = useCallback(() => { goToCtx(ctxIdx + 1) }, [goToCtx, ctxIdx])

  // Prevent background scroll while reel is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape key.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [router])

  const useCtx = inCtxMode && ctxItem !== null

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop — same style as recipe modal */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/75 backdrop-blur-xl hidden md:block"
        onClick={() => router.back()}
      />
      {/* Full-screen on mobile (black), transparent on desktop (DesktopReelViewer handles it) */}
      <div className="relative z-10 w-full h-full">
        <InstagramReelViewer
          {...props}
          initialReelId={useCtx ? ctxItem!.reel.id : props.initialReelId}
          allReels={useCtx ? [ctxItem!.reel] : props.allReels}
          creator={useCtx ? ctxItem!.creator : props.creator}
          initialIsFollowing={useCtx ? ctxItem!.isFollowing : props.initialIsFollowing}
          isOwnReel={useCtx ? ctxItem!.isOwnReel : props.isOwnReel}
          hideLikeCount={useCtx ? ctxItem!.hideLikeCount : props.hideLikeCount}
          blockComments={useCtx ? ctxItem!.blockComments : props.blockComments}
          ctxHasPrev={useCtx ? ctxHasPrev : undefined}
          ctxHasNext={useCtx ? ctxHasNext : undefined}
          ctxPrev={useCtx ? onCtxPrev : undefined}
          ctxNext={useCtx ? onCtxNext : undefined}
        />
      </div>
    </div>
  )
}
