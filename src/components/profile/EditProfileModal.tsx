'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, FileText, ChefHat, Loader2, AlertCircle } from 'lucide-react'

interface EditProfileModalProps {
  open: boolean
  initialName: string
  initialBio: string | null
  initialLevel: string
  onClose: () => void
  onSave: (updated: { name: string; bio: string | null; level: string }) => void
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
  initialName,
  initialBio,
  initialLevel,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const [mounted, setMounted] = useState(false)
  const [name,    setName]    = useState(initialName)
  const [bio,     setBio]     = useState(initialBio ?? '')
  const [level,   setLevel]   = useState(initialLevel)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      setName(initialName)
      setBio(initialBio ?? '')
      setLevel(initialLevel)
      setError(null)
      setSaving(false)
    }
  }, [open, initialName, initialBio, initialLevel])

  const hasChanges =
    name.trim() !== initialName.trim() ||
    (bio.trim() || null) !== (initialBio?.trim() || null) ||
    level !== initialLevel

  const canSave = hasChanges && !saving && name.trim().length > 0

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
                maxHeight:  'min(92dvh, 640px)',
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
                className="flex-1 overflow-y-auto px-6 py-5 space-y-5 edit-profile-scroll"
                style={{ overscrollBehavior: 'contain' }}
              >
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
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
