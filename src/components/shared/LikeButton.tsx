'use client'

import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

interface LikeButtonProps {
  liked: boolean
  likeCount: number
  onToggle: () => void
  pending?: boolean
  size?: 'sm' | 'md'
  showCount?: boolean
  variant?: 'default' | 'glass'
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function LikeButton({
  liked,
  likeCount,
  onToggle,
  pending = false,
  size = 'md',
  showCount = true,
  variant = 'default',
}: LikeButtonProps) {
  const iconSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'

  if (variant === 'glass') {
    return (
      <motion.button
        aria-label={liked ? 'Unlike' : 'Like'}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.80 }}
        onClick={onToggle}
        disabled={pending}
        className="flex flex-col items-center gap-1.5"
      >
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[18px] flex items-center justify-center border shadow-2xl transition-all duration-200 ${
          liked
            ? 'bg-white/18 border-white/20 backdrop-blur-2xl'
            : 'bg-black/45 border-white/10 backdrop-blur-2xl text-white hover:bg-white/18 hover:border-white/25'
        }`}>
          <motion.div animate={{ scale: liked ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.25 }}>
            <Heart
              size={20}
              strokeWidth={liked ? 0 : 1.8}
              className={liked ? 'fill-red-500 text-red-500' : ''}
            />
          </motion.div>
        </div>
        {showCount && (
          <span className="text-white/90 text-[11px] font-bold drop-shadow-md leading-none">
            {fmt(likeCount)}
          </span>
        )}
      </motion.button>
    )
  }

  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={onToggle}
      disabled={pending}
      aria-label={liked ? 'Unlike' : 'Like'}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-colors"
      style={{ color: liked ? '#F5C518' : 'var(--cr-text-muted)' }}
    >
      <motion.span animate={{ scale: liked ? [1, 1.5, 1] : 1 }} transition={{ duration: 0.25 }}>
        <Heart
          className={iconSize}
          style={{
            fill: liked ? '#F5C518' : 'transparent',
            color: liked ? '#F5C518' : 'var(--cr-text-muted)',
          }}
        />
      </motion.span>
      {showCount && (
        <span className="text-xs font-semibold tabular-nums">{fmt(likeCount)}</span>
      )}
    </motion.button>
  )
}
