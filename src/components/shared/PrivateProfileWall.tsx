'use client'

import { Lock } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'

interface Props {
  creatorName: string
  creatorUsername: string
  creatorAvatar: string | null
  standalone?: boolean
}

export function PrivateProfileWall({
  creatorName,
  creatorUsername,
  creatorAvatar,
  standalone = false,
}: Props) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--cr-bg-main, #0e0e0e)', zIndex: standalone ? 0 : 9999 }}
    >
      {/* Avatar with lock badge */}
      <div className="relative mb-4">
        <UserAvatar
          src={creatorAvatar}
          name={creatorName}
          size="xl"
        />
        <div
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'var(--cr-bg-card)', boxShadow: '0 0 0 2px var(--cr-bg-main)' }}
        >
          <Lock className="w-3.5 h-3.5" style={{ color: 'var(--cr-text-1)' }} />
        </div>
      </div>

      {/* Creator info */}
      <p className="text-base font-semibold mb-0.5" style={{ color: 'var(--cr-text-1)' }}>
        {creatorName}
      </p>
      <p className="text-sm mb-5" style={{ color: 'var(--cr-text-muted)' }}>
        @{creatorUsername}
      </p>

      {/* Message */}
      <p className="text-base font-semibold text-center mb-1.5" style={{ color: 'var(--cr-text-1)' }}>
        This account is private
      </p>
      <p className="text-sm text-center mb-6 max-w-xs" style={{ color: 'var(--cr-text-muted)' }}>
        Follow @{creatorUsername} to see their recipes and reels.
      </p>

      {/* Hard-navigate so the fixed overlay is fully unmounted */}
      <button
        onClick={() => { window.location.href = `/user/${creatorUsername}` }}
        className="px-8 py-2.5 rounded-full text-sm font-bold transition-opacity hover:opacity-90"
        style={{ background: '#F5C518', color: '#1A1A1A' }}
      >
        Visit Profile
      </button>
    </div>
  )
}
