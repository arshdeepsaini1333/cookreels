'use client'

import { useState, useEffect, useCallback } from 'react'
import { useReelSSE } from './useReelSSE'

const LIKE_EVENTS = ['reel:liked', 'reel:unliked']

export function useReelLikes(
  reelId: string,
  initialLikeCount = 0,
  isActive = true,
  initialLiked: boolean | null = null,
) {
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [liked, setLiked] = useState<boolean | null>(initialLiked)
  const [pending, setPending] = useState(false)

  // Skip the per-reel API round-trip when the feed already provided liked status.
  useEffect(() => {
    if (!reelId || initialLiked !== null) return
    fetch(`/api/reels/${reelId}/likes`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setLikeCount(d.likeCount)
        setLiked(d.liked)
      })
      .catch(() => {})
  }, [reelId, initialLiked])

  // Shared SSE connection — one EventSource per reelId, not two.
  useReelSSE(reelId, isActive, LIKE_EVENTS, (_type, data) => {
    setLikeCount((data as { likeCount: number }).likeCount)
  })

  const toggle = useCallback(async () => {
    if (pending || liked === null) return

    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(c => newLiked ? c + 1 : c - 1)
    setPending(true)

    try {
      const res = await fetch(`/api/reels/${reelId}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
      })
      if (!res.ok && res.status !== 409) {
        setLiked(!newLiked)
        setLikeCount(c => newLiked ? c - 1 : c + 1)
      }
    } catch {
      setLiked(!newLiked)
      setLikeCount(c => newLiked ? c - 1 : c + 1)
    } finally {
      setPending(false)
    }
  }, [reelId, liked, pending])

  return { likeCount, liked: liked ?? false, likeLoaded: liked !== null, toggle, pending }
}
