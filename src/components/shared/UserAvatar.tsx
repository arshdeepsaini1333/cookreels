'use client'

import { useState } from 'react'

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
  size?: AvatarSize
  className?: string
  loading?: 'lazy' | 'eager'
}

export function UserAvatar({
  src,
  name,
  size = 'md',
  className = '',
  loading = 'lazy',
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const dim = SIZE_MAP[size]
  const isGooglePhoto = src ? /googleusercontent\.com/i.test(src) : false
  const showImage = src && !imgFailed && !isGooglePhoto

  return (
    <div className={`${dim} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? ''}
          className="w-full h-full object-cover"
          loading={loading}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold"
          style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
        >
          {getInitials(name)}
        </div>
      )}
    </div>
  )
}
