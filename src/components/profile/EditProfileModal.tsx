'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, FileText, ChefHat, Loader2, AlertCircle, Camera } from 'lucide-react'
import { ImageCropModal, validateImageFile } from './ImageCropModal'

interface EditProfileModalProps {
  open: boolean
  userId: string
  initialName: string
  initialBio: string | null
  initialLevel: string
  initialCoverUrl?: string | null
  initialAvatarUrl?: string | null
  onClose: () => void
  onSave: (updated: { name: string; bio: string | null; level: string }) => void
  onCoverUpdate?: (url: string) => void
  onAvatarUpdate?: (url: string) => void
}

const LEVELS = [
  { emoji: '🏠', label: 'Home Chef'          },
  { emoji: '🌱', label: 'Cooking Enthusiast' },
  { emoji: '🎓', label: 'Culinary Student'   },
  { emoji: '👨‍🍳', label: 'Amateur Chef'       },
  { emoji: '⭐', label: 'Professional Chef'  },
  { emoji: '🍰', label: 'Pastry Chef'        },
  { emoji: '👑', label: 'Executive Chef'     },
]

export function EditProfileModal({
  open,
  userId,
  initialName,
  initialBio,
  initialLevel,
  initialCoverUrl,
  initialAvatarUrl,
  onClose,
  onSave,
  onCoverUpdate,
  onAvatarUpdate,
}: EditProfileModalProps) {
  const [mounted, setMounted] = useState(false)
  const [name,    setName]    = useState(initialName)
  const [bio,     setBio]     = useState(initialBio ?? '')
  const [level,   setLevel]   = useState(initialLevel)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [coverUrl,  setCoverUrl]  = useState<string | null>(initialCoverUrl ?? null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl ?? null)
  const [cropModal, setCropModal] = useState<{ type: 'avatar' | 'cover'; file: File } | null>(null)
  const [imgError,  setImgError]  = useState<string | null>(null)

  const coverInputRef  = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      setName(initialName)
      setBio(initialBio ?? '')
      setLevel(initialLevel)
      setCoverUrl(initialCoverUrl ?? null)
      setAvatarUrl(initialAvatarUrl ?? null)
      setError(null)
      setImgError(null)
      setSaving(false)
    }
  }, [open, initialName, initialBio, initialLevel, initialCoverUrl, initialAvatarUrl])

  const hasChanges =
    name.trim() !== initialName.trim() ||
    (bio.trim() || null) !== (initialBio?.trim() || null) ||
    level !== initialLevel

  const canSave = hasChanges && !saving && name.trim().length > 0

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const err = validateImageFile(file)
    if (err) { setImgError(err); return }
    setImgError(null)
    setCropModal({ type, file })
  }

  const handleSave = async () => {
    if (!canSave) return
    setError(null)
    setSaving(true)

    const body: Record<string, string> = {}
    if (name.trim()  !== initialName.trim())                      body.name  = name.trim()
    if ((bio.trim() || null) !== (initialBio?.trim() || null))    body.bio   = bio.trim()
    if (level !== initialLevel)                                    body.level = level

    try {
      const res  = await fetch('/api/profile/update', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to save changes')
        setSaving(false)
        return
      }

      onSave({
        name:  data.name  ?? name.trim(),
        bio:   'bio' in data ? data.bio : (bio.trim() || null),
        level: data.level ?? level,
      })
      onClose()
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="edit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="edit-modal"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-md flex flex-col rounded-3xl overflow-hidden"
              style={{
                background: 'var(--cr-bg-card)',
                boxShadow:  '0 24px 80px rgba(0,0,0,0.45)',
                maxHeight:  'min(92dvh, 720px)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-5 flex-shrink-0 border-b"
                style={{ borderColor: 'var(--cr-border)' }}
              >
                <h2
                  className="text-lg font-bold"
                  style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}
                >
                  Edit Profile
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
                </button>
              </div>

              {/* Scrollable body */}
              <div
                className="flex-1 overflow-y-auto edit-profile-scroll"
                style={{ overscrollBehavior: 'contain' }}
              >
                {/* ── BANNER SECTION ─────────────────────────────── */}
                <div className="relative">
                  {/* Banner */}
                  <div
                    className="w-full h-28 overflow-hidden relative cursor-pointer group"
                    onClick={() => coverInputRef.current?.click()}
                    style={!coverUrl ? { background: 'linear-gradient(135deg, #1a1a1b 0%, #2B2B2D 25%, #3d2810 55%, rgba(245,197,24,0.55) 100%)' } : undefined}
                    title="Change banner"
                  >
                    {coverUrl && (
                      <img
                        src={coverUrl}
                        alt="Banner"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    {!coverUrl && (
                      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
                        <span className="absolute top-2 right-6 text-3xl opacity-25">🍳</span>
                        <span className="absolute bottom-2 left-8 text-2xl opacity-20">🌶️</span>
                        <span className="absolute top-3 left-1/3 text-2xl opacity-15">🍜</span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-semibold">
                        <Camera className="w-3.5 h-3.5" /> Change Banner
                      </div>
                    </div>
                    {/* Always-visible edit hint in corner */}
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <Camera className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>

                  {/* Avatar overlapping banner */}
                  <div className="px-5 -mt-9 mb-2 flex items-end gap-3">
                    <div className="relative shrink-0">
                      <div
                        className="w-16 h-16 rounded-full p-[2.5px] shrink-0"
                        style={{ background: 'linear-gradient(135deg, #F5C518, #FF9F1C, #F5C518)' }}
                      >
                        <div
                          className="w-full h-full rounded-full overflow-hidden"
                          style={{ border: '2.5px solid var(--cr-bg-card)' }}
                        >
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-lg font-bold"
                              style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                            >
                              {name.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 hover:scale-110 transition-transform shadow"
                        style={{ background: 'var(--cr-accent)', borderColor: 'var(--cr-bg-card)', color: '#1A1A1A' }}
                        title="Change profile photo"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--cr-text-muted)' }}>
                      Tap to change photo
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-5 space-y-5">
                  {/* Image error */}
                  <AnimatePresence>
                    {imgError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {imgError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Error banner */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Name */}
                  <div>
                    <label
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2"
                      style={{ color: 'var(--cr-text-muted)' }}
                    >
                      <User className="w-3.5 h-3.5" /> Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      maxLength={60}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                      style={{
                        background:  'var(--cr-bg-surface)',
                        color:       'var(--cr-text-1)',
                        borderColor: 'var(--cr-border)',
                      }}
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2"
                      style={{ color: 'var(--cr-text-muted)' }}
                    >
                      <FileText className="w-3.5 h-3.5" /> Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Write something about yourself…"
                      maxLength={200}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border resize-none"
                      style={{
                        background:  'var(--cr-bg-surface)',
                        color:       'var(--cr-text-1)',
                        borderColor: 'var(--cr-border)',
                      }}
                    />
                    <p className="mt-1 text-right text-xs" style={{ color: 'var(--cr-text-muted)' }}>
                      {bio.length}/200
                    </p>
                  </div>

                  {/* Chef Level */}
                  <div>
                    <label
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-3"
                      style={{ color: 'var(--cr-text-muted)' }}
                    >
                      <ChefHat className="w-3.5 h-3.5" /> Chef Level
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {LEVELS.map(({ emoji, label }) => {
                        const selected = level === label
                        return (
                          <motion.button
                            key={label}
                            type="button"
                            onClick={() => setLevel(label)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                            style={
                              selected
                                ? { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A', borderColor: 'transparent', boxShadow: '0 2px 12px rgba(245,197,24,0.35)' }
                                : { background: 'var(--cr-bg-surface)', color: 'var(--cr-text-2)', borderColor: 'var(--cr-border)' }
                            }
                          >
                            {emoji} {label}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center gap-3 px-6 py-4 flex-shrink-0 border-t"
                style={{ borderColor: 'var(--cr-border)' }}
              >
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                  style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-surface)' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  whileHover={canSave ? { scale: 1.03 } : {}}
                  whileTap={canSave ? { scale: 0.97 } : {}}
                  disabled={!canSave}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: canSave ? 'linear-gradient(135deg,#F5C518,#FFB800)' : 'var(--cr-bg-surface)',
                    color:      canSave ? '#1A1A1A' : 'var(--cr-text-muted)',
                    border:     canSave ? 'none' : '1px solid var(--cr-border)',
                    opacity:    canSave ? 1 : 0.6,
                  }}
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : 'Save Changes'
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Hidden file inputs */}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={e => handleFileSelect(e, 'cover')}
          />
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={e => handleFileSelect(e, 'avatar')}
          />

          {/* Crop modal — z-150/151 so it sits above this modal at z-110/120 */}
          <ImageCropModal
            open={cropModal !== null}
            file={cropModal?.file ?? null}
            type={cropModal?.type ?? 'avatar'}
            userId={userId}
            onClose={() => setCropModal(null)}
            onSuccess={(url) => {
              if (cropModal?.type === 'avatar') {
                setAvatarUrl(url)
                onAvatarUpdate?.(url)
              } else {
                setCoverUrl(url)
                onCoverUpdate?.(url)
              }
              setCropModal(null)
            }}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
