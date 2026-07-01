'use client'

import { VideoHTMLAttributes, ImgHTMLAttributes, CSSProperties, Ref } from 'react'
import { mediaUrl } from '@/lib/mediaUrl'

// Deters casual right-click/long-press "Save as" and drag-out downloads on
// reel/recipe media. Not a real DRM boundary — anyone can still pull bytes
// from devtools — this just removes the one-click affordances.
const noCallout: CSSProperties = { WebkitTouchCallout: 'none' }

interface ProtectedVideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'poster'> {
  src?: string | null
  poster?: string | null
  ref?: Ref<HTMLVideoElement>
}

export function ProtectedVideo({ src, poster, style, ...props }: ProtectedVideoProps) {
  return (
    <video
      {...props}
      src={src ? mediaUrl(src) : undefined}
      poster={poster ? mediaUrl(poster) : undefined}
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
      style={{ ...style, ...noCallout }}
    />
  )
}

interface ProtectedImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null
}

export function ProtectedImg({ src, style, ...props }: ProtectedImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={src ? mediaUrl(src) : undefined}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      style={{ ...style, ...noCallout, userSelect: 'none' }}
    />
  )
}
