'use client'

import { useState, useEffect, useCallback } from 'react'

export type NotificationItem = {
  id: string
  type: string
  isRead: boolean
  createdAt: string
  text: string | null
  body: string | null
  sender: { id: string; username: string; profileImage: string | null }
  recipe: { id: string; title: string; coverImage: string | null } | null
  reel: { id: string; title: string; thumbnailUrl: string | null } | null
}

type FetchState = {
  notifications: NotificationItem[]
  unreadCount: number
  nextCursor: string | null
  loading: boolean
  loadingMore: boolean
  error: string | null
}

export function useNotifications() {
  const [state, setState] = useState<FetchState>({
    notifications: [],
    unreadCount: 0,
    nextCursor: null,
    loading: true,
    loadingMore: false,
    error: null,
  })

  const fetch_ = useCallback(async (cursor?: string) => {
    const isCursor = !!cursor
    setState(s => ({ ...s, loading: !isCursor, loadingMore: isCursor, error: null }))
    try {
      const url = cursor
        ? `/api/notifications?cursor=${encodeURIComponent(cursor)}`
        : '/api/notifications'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setState(s => ({
        ...s,
        notifications: isCursor
          ? [...s.notifications, ...data.notifications]
          : data.notifications,
        unreadCount: data.unreadCount,
        nextCursor: data.nextCursor,
        loading: false,
        loadingMore: false,
      }))
    } catch (e) {
      setState(s => ({
        ...s,
        loading: false,
        loadingMore: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }))
    }
  }, [])

  const refetch = useCallback(() => fetch_(), [fetch_])

  const loadMore = useCallback(() => {
    if (state.nextCursor && !state.loadingMore) fetch_(state.nextCursor)
  }, [state.nextCursor, state.loadingMore, fetch_])

  const markRead = useCallback(async (ids: string[]) => {
    setState(s => ({
      ...s,
      notifications: s.notifications.map(n =>
        ids.includes(n.id) ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - ids.filter(id =>
        s.notifications.find(n => n.id === id && !n.isRead)
      ).length),
    }))
    try {
      await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
    } catch { /* ignore */ }
  }, [])

  const markAllRead = useCallback(async () => {
    setState(s => ({
      ...s,
      notifications: s.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }))
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' })
    } catch { /* ignore */ }
  }, [])

  // Handle SSE-pushed new notifications
  const prependNotification = useCallback((n: NotificationItem) => {
    setState(s => ({
      ...s,
      notifications: [n, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }))
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  return {
    ...state,
    refetch,
    loadMore,
    markRead,
    markAllRead,
    prependNotification,
  }
}
