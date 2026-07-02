'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BellOff, CheckCheck } from 'lucide-react'
import { useNotifications, type NotificationItem } from '@/hooks/useNotifications'
import { NotificationItem as NotifItemComponent } from './NotificationItem'

interface Props {
  open: boolean
  onClose: () => void
  isDark: boolean
  newNotification?: NotificationItem | null
  // The bell button (or its wrapper) the panel should hang from. Position is
  // computed from its real on-screen rect rather than CSS `absolute right-0`,
  // since the header's entrance animation puts a `transform` on an ancestor
  // — any transformed ancestor becomes the containing block for descendants,
  // which silently breaks plain `absolute`/`fixed` positioning math, and a
  // fixed 360px width has no room on mobile viewports regardless.
  anchorRef: React.RefObject<HTMLElement | null>
}

function Skeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-2 h-2 flex-shrink-0 mt-1" />
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 animate-pulse"
        style={{ background: isDark ? '#343438' : '#E8E8E8' }}
      />
      <div className="flex-1 space-y-2">
        <div
          className="h-3 rounded animate-pulse w-3/4"
          style={{ background: isDark ? '#343438' : '#E8E8E8' }}
        />
        <div
          className="h-3 rounded animate-pulse w-1/2"
          style={{ background: isDark ? '#2B2B2D' : '#F0F0F0' }}
        />
      </div>
    </div>
  )
}

export function NotificationDropdown({ open, onClose, isDark, newNotification, anchorRef }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; right: number; width: number } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Compute the panel's fixed viewport position from the bell button's real
  // on-screen rect, clamped so it always stays fully on-screen — this is what
  // guarantees it never overflows the left edge on narrow mobile viewports.
  useEffect(() => {
    if (!open) return
    const compute = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const margin = 12
      const width = Math.min(360, window.innerWidth - margin * 2)
      let right = window.innerWidth - rect.right
      const left = window.innerWidth - right - width
      if (left < margin) right = window.innerWidth - margin - width
      setCoords({ top: rect.bottom + 10, right, width })
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [open, anchorRef])

  const {
    notifications,
    unreadCount,
    nextCursor,
    loading,
    loadingMore,
    markRead,
    markAllRead,
    loadMore,
    prependNotification,
  } = useNotifications()

  // Prepend new notification received from parent via SSE
  useEffect(() => {
    if (newNotification) prependNotification(newNotification)
  }, [newNotification, prependNotification])

  // Mark visible unread items as read when panel opens
  useEffect(() => {
    if (!open || notifications.length === 0) return
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id)
    if (unreadIds.length > 0) {
      markRead(unreadIds)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!bottomRef.current || !nextCursor) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { threshold: 0.5 })
    observer.observe(bottomRef.current)
    return () => observer.disconnect()
  }, [nextCursor, loadMore])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && coords && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="fixed rounded-2xl backdrop-blur-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
          style={{
            top: coords.top,
            right: coords.right,
            width: coords.width,
            background: isDark ? 'rgba(30,30,31,0.97)' : 'rgba(255,255,255,0.97)',
            border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
            boxShadow: isDark
              ? '0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(52,52,56,0.80)'
              : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(232,232,232,0.90)',
            maxHeight: 'min(480px, calc(100vh - 100px))',
          }}
        >
          {/* Accent top line */}
          <div className="h-[2px] bg-gradient-to-r from-[#F5C518] to-[#FF9F1C] flex-shrink-0" />

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
            style={{ borderColor: isDark ? '#343438' : '#E8E8E8' }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#111827' }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: '#F5C518', color: '#1A1A1A' }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors duration-150"
                style={{ color: isDark ? '#A1A1AA' : '#6B7280' }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#F5C518'
                  ;(e.currentTarget as HTMLButtonElement).style.background = isDark
                    ? 'rgba(245,197,24,0.08)'
                    : 'rgba(245,197,24,0.10)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLButtonElement).style.color = isDark
                    ? '#A1A1AA'
                    : '#6B7280'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <CheckCheck size={13} strokeWidth={2} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <>
                <Skeleton isDark={isDark} />
                <Skeleton isDark={isDark} />
                <Skeleton isDark={isDark} />
              </>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: isDark ? '#2B2B2D' : '#F5F5F5' }}
                >
                  <BellOff size={20} style={{ color: isDark ? '#52525B' : '#9CA3AF' }} />
                </div>
                <p className="text-[13px]" style={{ color: isDark ? '#52525B' : '#9CA3AF' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              <>
                {notifications.map(n => (
                  <NotifItemComponent key={n.id} notification={n} isDark={isDark} />
                ))}

                {nextCursor && (
                  <div ref={bottomRef} className="py-2">
                    {loadingMore && (
                      <>
                        <Skeleton isDark={isDark} />
                        <Skeleton isDark={isDark} />
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
