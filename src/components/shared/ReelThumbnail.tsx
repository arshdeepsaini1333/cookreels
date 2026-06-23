'use client'

import { useEffect, useRef, useState } from 'react'

interface ReelThumbnailProps {
  videoUrl: string
  thumbnailUrl?: string | null
  imgClassName?: string
}

export function ReelThumbnail({ videoUrl, thumbnailUrl, imgClassName }: ReelThumbnailProps) {
  const [inView, setInView] = useState(false)
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
      {/* Show thumbnailUrl as immediate fallback while video loads */}
      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt=""
          draggable={false}
          className={`absolute inset-0 w-full h-full object-cover ${imgClassName ?? ''}`}
        />
      )}

      {inView && (
        <video
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
