'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, Check, Loader2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Canvas crop helpers ──────────────────────────────────────────────────────

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', (e) => reject(e))
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
  isAvatar: boolean,
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const outW = isAvatar ? 600 : 1800
  const outH = isAvatar ? 600 : 600

  canvas.width = outW
  canvas.height = outH

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH,
  )

  return new Promise((resolve, reject) => {
    const supportsWebP = canvas
      .toDataURL('image/webp')
      .startsWith('data:image/webp')
    const mime = supportsWebP ? 'image/webp' : 'image/jpeg'
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas empty'))),
      mime,
      0.87,
    )
  })
}

// ─── File validation ──────────────────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed.'
  }
  if (file.size > MAX_BYTES) {
    return 'Image must be smaller than 10 MB.'
  }
  return null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageCropModalProps {
  open: boolean
  file: File | null
  type: 'avatar' | 'cover'
  userId: string
  onClose: () => void
  onSuccess: (url: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageCropModal({
  open,
  file,
  type,
  userId,
  onClose,
  onSuccess,
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build object URL from file whenever it changes
  useEffect(() => {
    if (!file) {
      setImageSrc(null)
      return
    }
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setError(null)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels || uploading) return
    setUploading(true)
    setError(null)

    try {
      const isAvatar = type === 'avatar'
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, isAvatar)

      const folder = isAvatar
        ? 'profiles/display_picture'
        : 'profiles/background_picture'
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
      const filename = `${userId}_${Date.now()}.${ext}`

      // 1. Get signed upload URL
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileType: blob.type,
          fileName: filename,
          folder,
        }),
      })
      if (!uploadRes.ok) throw new Error('Failed to get upload URL')

      const { signedUrl, fileUrl } = (await uploadRes.json()) as {
        signedUrl: string
        fileUrl: string
      }

      // 2. Upload directly to S3
      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': blob.type },
        body: blob,
      })
      if (!putRes.ok)
        throw new Error(`S3 upload failed (${putRes.status})`)

      // 3. Persist URL in database
      const apiPath = isAvatar
        ? '/api/profile/display-picture'
        : '/api/profile/background-picture'
      const saveRes = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl }),
      })
      if (!saveRes.ok) throw new Error('Failed to save image to profile')

      // Notify Header/Sidebar so they update without a page reload
      if (type === 'avatar') {
        window.dispatchEvent(
          new CustomEvent('cr:avatar-updated', { detail: { url: fileUrl } }),
        )
      }

      onSuccess(fileUrl)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      )
    } finally {
      setUploading(false)
    }
  }

  const isAvatar = type === 'avatar'

  return (
    <AnimatePresence>
      {open && imageSrc && (
        <>
          {/* Backdrop */}
          <motion.div
            key="crop-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={uploading ? undefined : onClose}
            className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm"
          />

          {/* Modal shell */}
          <motion.div
            key="crop-modal"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed inset-0 z-[151] flex items-center justify-center p-4"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="relative w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
              style={{
                background: 'var(--cr-bg-card)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
                pointerEvents: 'all',
                maxHeight: '92vh',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: 'var(--cr-border)' }}
              >
                <h2
                  className="text-base font-bold"
                  style={{
                    color: 'var(--cr-text-1)',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {isAvatar ? 'Adjust Profile Photo' : 'Adjust Cover Photo'}
                </h2>
                <button
                  onClick={onClose}
                  disabled={uploading}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
                </button>
              </div>

              {/* Cropper */}
              <div
                className="relative w-full"
                style={{
                  height: isAvatar ? 380 : 240,
                  background: '#000',
                  flexShrink: 0,
                }}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  minZoom={1}
                  maxZoom={3}
                  aspect={isAvatar ? 1 : 3}
                  cropShape={isAvatar ? 'round' : 'rect'}
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Controls */}
              <div className="px-5 py-4 space-y-4">
                {/* Zoom */}
                <div className="flex items-center gap-3">
                  <ZoomOut
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--cr-text-muted)' }}
                  />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-full cursor-pointer"
                    style={{ accentColor: 'var(--cr-accent)' }}
                  />
                  <ZoomIn
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--cr-text-muted)' }}
                  />
                </div>

                <p
                  className="text-[11px] text-center"
                  style={{ color: 'var(--cr-text-muted)' }}
                >
                  Drag to reposition · Pinch or scroll to zoom
                </p>

                {/* Error banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-500">{error}</p>
                  </motion.div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    disabled={uploading}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold border transition-colors disabled:opacity-40"
                    style={{
                      borderColor: 'var(--cr-border)',
                      color: 'var(--cr-text-1)',
                      background: 'var(--cr-bg-surface)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg,#F5C518,#FFB800)',
                      color: '#1A1A1A',
                    }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Photo
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
