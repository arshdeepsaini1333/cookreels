'use client'

import { useState, type CSSProperties } from 'react'
import { ProtectedImg } from '@/components/shared/ProtectedMedia'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_MAP: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-9 h-9 text-[11px]',
  lg: 'w-11 h-11 text-xs',
  xl: 'w-14 h-14 text-sm',
}

function getInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface UserAvatarProps {
  src?: string | null
  name: string | null | undefined
  /** Preset size, or a raw Tailwind size/text className (e.g. "w-10 h-10 text-xs") for one-off dimensions. */
  size?: AvatarSize | (string & {})
  className?: string
  style?: CSSProperties
  loading?: 'lazy' | 'eager'
  fallbackClassName?: string
  fallbackStyle?: CSSProperties
}

export function UserAvatar({
  src,
  name,
  size = 'md',
  className = '',
  style,
  loading = 'lazy',
  fallbackClassName = '',
  fallbackStyle,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const dim = SIZE_MAP[size as AvatarSize] ?? size
  const showImage = src && !imgFailed

  return (
    <div className={`${dim} rounded-full overflow-hidden flex-shrink-0 ${className}`} style={style}>
      {showImage ? (
        <ProtectedImg
          src={src}
          alt={name ?? ''}
          className="w-full h-full object-cover"
          loading={loading}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-bold ${fallbackClassName}`}
          style={fallbackStyle ?? { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  )
}
