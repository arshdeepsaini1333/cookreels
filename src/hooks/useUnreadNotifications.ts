'use client'

import { useState, useEffect } from 'react'

export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/notifications/unread-count')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setUnreadCount(data.count ?? 0) })
      .catch(() => {})
  }, [])

  return { unreadCount }
}
