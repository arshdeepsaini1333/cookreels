'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { InstagramReelViewer } from '@/components/reels/InstagramReelViewer'
import type { InstagramReelViewerProps } from '@/components/reels/InstagramReelViewer'

type ReelModalClientProps = InstagramReelViewerProps

export function ReelModalClient(props: ReelModalClientProps) {
  const router = useRouter()

  // Prevent the background page from scrolling while the reel is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape key.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [router])

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Tap backdrop to dismiss */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => router.back()}
      />
      <div className="relative z-10 w-full h-full">
        <InstagramReelViewer {...props} />
      </div>
    </div>
  )
}
