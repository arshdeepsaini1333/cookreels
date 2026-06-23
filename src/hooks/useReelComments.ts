'use client'

import { useState, useEffect, useCallback } from 'react'
import { useReelSSE } from './useReelSSE'

export interface ReelCommentItem {
  id: string
  username: string
  userAvatar: string | null
  text: string
  createdAt: string
}

const COMMENT_EVENTS = ['reel:commentAdded']

export function useReelComments(reelId: string, isActive = true) {
  const [comments, setComments] = useState<ReelCommentItem[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!reelId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reels/${reelId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments)
        setCommentCount(data.commentCount)
      }
    } catch {
      setError('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [reelId])

  // Only load comments when the drawer is open (isActive), not on every scroll.
  useEffect(() => {
    if (reelId && isActive) fetchComments()
  }, [reelId, isActive, fetchComments])

  // Shared SSE connection — reuses the same EventSource as useReelLikes.
  useReelSSE(reelId, isActive, COMMENT_EVENTS, (_type, data) => {
    const { commentCount: count, comment } = data as {
      commentCount: number
      comment: ReelCommentItem
    }
    setCommentCount(count)
    setComments(prev => {
      if (prev.some(c => c.id === comment.id)) return prev
      return [...prev, comment]
    })
  })

  const addComment = useCallback(async (content: string): Promise<boolean> => {
    const trimmed = content.trim()
    if (!trimmed || submitting) return false
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/reels/${reelId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to post comment' }))
        setError(err.error ?? 'Failed to post comment')
        return false
      }

      const data = await res.json()
      setComments(prev => {
        if (prev.some(c => c.id === data.comment.id)) return prev
        return [...prev, data.comment]
      })
      setCommentCount(data.commentCount)
      return true
    } catch {
      setError('Failed to post comment')
      return false
    } finally {
      setSubmitting(false)
    }
  }, [reelId, submitting])

  return { comments, commentCount, loading, submitting, error, addComment, refetch: fetchComments }
}
