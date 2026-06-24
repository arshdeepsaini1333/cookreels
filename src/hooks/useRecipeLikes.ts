'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRecipeSSE } from './useRecipeSSE'

const LIKE_EVENTS = ['recipe:liked', 'recipe:unliked']

export function useRecipeLikes(
  recipeId: string,
  initialLikeCount = 0,
  isActive = true,
) {
  const [likeCount,     setLikeCount]     = useState(initialLikeCount)
  const [liked,         setLiked]         = useState<boolean | null>(null)
  const [pending,       setPending]       = useState(false)
  const [hideLikeCount, setHideLikeCount] = useState(false)

  // Fetch current like status from API
  useEffect(() => {
    if (!recipeId) return
    fetch(`/api/recipes/${recipeId}/likes`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setLikeCount(d.likeCount)
        setLiked(d.liked)
        if (typeof d.hideLikeCount === 'boolean') setHideLikeCount(d.hideLikeCount)
      })
      .catch(() => {})
  }, [recipeId])

  // Shared SSE connection — one EventSource per recipeId, not two.
  useRecipeSSE(recipeId, isActive, LIKE_EVENTS, (_type, data) => {
    setLikeCount((data as { likeCount: number }).likeCount)
  })

  const toggle = useCallback(async () => {
    if (pending || liked === null) return

    const newLiked = !liked
    // Optimistic update
    setLiked(newLiked)
    setLikeCount(c => newLiked ? c + 1 : c - 1)
    setPending(true)

    try {
      const res = await fetch(`/api/recipes/${recipeId}/like`, {
        method: newLiked ? 'POST' : 'DELETE',
      })
      if (!res.ok && res.status !== 409) {
        // Revert on error (409 = already liked, which is ok)
        setLiked(!newLiked)
        setLikeCount(c => newLiked ? c - 1 : c + 1)
      }
    } catch {
      setLiked(!newLiked)
      setLikeCount(c => newLiked ? c - 1 : c + 1)
    } finally {
      setPending(false)
    }
  }, [recipeId, liked, pending])

  return { likeCount, hideLikeCount, liked: liked ?? false, likeLoaded: liked !== null, toggle, pending }
}
