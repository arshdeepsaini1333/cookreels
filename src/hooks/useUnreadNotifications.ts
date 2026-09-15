'use client'

import { useState, useEffect } from 'react'

export function useUnreadNotifications(enabled = true) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!enabled) return
    fetch('/api/notifications/unread-count')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setUnreadCount(data.count ?? 0) })
      .catch(() => {})
  }, [enabled])

  return { unreadCount }
}
