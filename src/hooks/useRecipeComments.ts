'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRecipeSSE } from './useRecipeSSE'

export interface RecipeCommentItem {
  id: string
  userId?: string
  username: string
  userAvatar: string | null
  text: string
  createdAt: string
}

const COMMENT_EVENTS = ['recipe:commentAdded']

export function useRecipeComments(recipeId: string, isActive = true) {
  const [comments, setComments] = useState<RecipeCommentItem[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!recipeId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/recipes/${recipeId}/comments`)
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
  }, [recipeId])

  useEffect(() => {
    if (recipeId) fetchComments()
  }, [recipeId, fetchComments])

  // Shared SSE connection — reuses the same EventSource as useRecipeLikes.
  useRecipeSSE(recipeId, isActive, COMMENT_EVENTS, (_type, data) => {
    const { commentCount: count, comment } = data as {
      commentCount: number
      comment: RecipeCommentItem
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
      const res = await fetch(`/api/recipes/${recipeId}/comments`, {
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
      // Deduplicate in case SSE already added it
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
  }, [recipeId, submitting])

  const deleteComment = useCallback((commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId))
    setCommentCount(prev => Math.max(0, prev - 1))
  }, [])

  return { comments, commentCount, loading, submitting, error, addComment, deleteComment, refetch: fetchComments }
}
