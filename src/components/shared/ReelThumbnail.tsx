'use client'

import { useEffect, useRef, useState } from 'react'
import { ProtectedImg, ProtectedVideo } from '@/components/shared/ProtectedMedia'

interface ReelThumbnailProps {
  videoUrl: string
  thumbnailUrl?: string | null
  imgClassName?: string
}

export function ReelThumbnail({ videoUrl, thumbnailUrl, imgClassName }: ReelThumbnailProps) {
  const [inView, setInView] = useState(false)
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>(
    thumbnailUrl ? 'loading' : 'error',
  )
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          setInView(true)
        }
      },
      { rootMargin: '150px', threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const onLoadedMetadata: React.ReactEventHandler<HTMLVideoElement> = (e) => {
    const vid = e.currentTarget
    vid.currentTime = Math.min(1, (vid.duration || 10) * 0.1)
  }

  return (
    <div ref={rootRef} className="absolute inset-0">
      {/* Shimmer skeleton — visible only while thumbnail is loading */}
      {imgState === 'loading' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-neutral-800/60" />
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)',
            }}
          />
        </div>
      )}

      {/* Thumbnail image */}
      {thumbnailUrl && imgState !== 'error' && (
        <ProtectedImg
          src={thumbnailUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imgState === 'loaded' ? 'opacity-100' : 'opacity-0'} ${imgClassName ?? ''}`}
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
        />
      )}

      {/* Video (lazy — only after entering viewport) */}
      {inView && (
        <ProtectedVideo
          src={videoUrl}
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={onLoadedMetadata}
          className={`absolute inset-0 w-full h-full object-cover ${imgClassName ?? ''}`}
        />
      )}
    </div>
  )
}
