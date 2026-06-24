'use client'

import { useState } from 'react'
import type { NotificationItem as NotifType } from '@/hooks/useNotifications'
import { UserAvatar } from '@/components/shared/UserAvatar'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return `${Math.floor(d / 7)}w`
}

function fallbackText(n: NotifType): string {
  const name = n.sender.username
  switch (n.type) {
    case 'FOLLOW':          return `${name} started following you.`
    case 'FOLLOW_REQUEST':  return `${name} requested to follow you.`
    case 'FOLLOW_ACCEPTED': return `${name} accepted your follow request.`
    case 'RECIPE_LIKE':     return n.recipe ? `${name} liked your recipe "${n.recipe.title}".` : `${name} liked your recipe.`
    case 'RECIPE_COMMENT':  return n.recipe ? `${name} commented on your recipe "${n.recipe.title}".` : `${name} commented on your recipe.`
    case 'REEL_LIKE':       return n.reel ? `${name} liked your reel "${n.reel.title}".` : `${name} liked your reel.`
    case 'REEL_COMMENT':    return n.reel ? `${name} commented on your reel "${n.reel.title}".` : `${name} commented on your reel.`
    default:                return `${name} interacted with your content.`
  }
}

interface Props {
  notification: NotifType
  isDark: boolean
}

export function NotificationItem({ notification: n, isDark }: Props) {
  const displayText = n.text ?? fallbackText(n)
  const thumbnail   = n.reel?.thumbnailUrl ?? n.recipe?.coverImage

  const [reqStatus, setReqStatus] = useState<'idle' | 'pending' | 'accepted' | 'declined'>('idle')

  const handleFollowRequest = async (action: 'accept' | 'decline') => {
    if (reqStatus === 'pending') return
    setReqStatus('pending')
    try {
      const res = await fetch('/api/social/follow-requests', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, requesterId: n.sender.id }),
      })
      if (res.ok) {
        setReqStatus(action === 'accept' ? 'accepted' : 'declined')
      } else {
        setReqStatus('idle')
      }
    } catch {
      setReqStatus('idle')
    }
  }

  const isFollowRequest = n.type === 'FOLLOW_REQUEST'

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-colors duration-150"
      style={{
        background: n.isRead
          ? 'transparent'
          : isDark ? 'rgba(245,197,24,0.05)' : 'rgba(245,197,24,0.07)',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.background = isDark
          ? 'rgba(52,52,56,0.50)'
          : 'rgba(245,241,217,0.60)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.background = n.isRead
          ? 'transparent'
          : isDark ? 'rgba(245,197,24,0.05)' : 'rgba(245,197,24,0.07)'
      }}
    >
      {/* Unread dot */}
      <div className="flex-shrink-0 mt-2">
        {!n.isRead
          ? <span className="block w-2 h-2 rounded-full bg-[#F5C518]" />
          : <span className="block w-2 h-2" />
        }
      </div>

      {/* Sender avatar */}
      <UserAvatar src={n.sender.profileImage} name={n.sender.username} size="md" />

      {/* Text + actions */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug break-words" style={{ color: isDark ? '#D4D4D8' : '#374151' }}>
          {displayText}
        </p>
        <p className="text-[11px] mt-1" style={{ color: isDark ? '#52525B' : '#9CA3AF' }}>
          {timeAgo(n.createdAt)}
        </p>

        {/* Accept / Decline buttons for follow requests */}
        {isFollowRequest && (
          <div className="flex gap-2 mt-2">
            {reqStatus === 'accepted' && (
              <span className="text-[12px] font-semibold text-emerald-500">Accepted</span>
            )}
            {reqStatus === 'declined' && (
              <span className="text-[12px] font-semibold" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Declined</span>
            )}
            {(reqStatus === 'idle' || reqStatus === 'pending') && (
              <>
                <button
                  onClick={() => handleFollowRequest('accept')}
                  disabled={reqStatus === 'pending'}
                  className="px-3 py-1 rounded-full text-[12px] font-semibold transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                >
                  {reqStatus === 'pending' ? '…' : 'Accept'}
                </button>
                <button
                  onClick={() => handleFollowRequest('decline')}
                  disabled={reqStatus === 'pending'}
                  className="px-3 py-1 rounded-full text-[12px] font-semibold border transition-all disabled:opacity-60"
                  style={{ borderColor: isDark ? '#3F3F46' : '#E5E7EB', color: isDark ? '#D4D4D8' : '#374151', background: 'transparent' }}
                >
                  Decline
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content thumbnail (not shown for follow requests) */}
      {thumbnail && !isFollowRequest && (
        <div className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt=""
            className="w-10 h-10 rounded-lg object-cover"
            style={{ border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}` }}
          />
        </div>
      )}
    </div>
  )
}
