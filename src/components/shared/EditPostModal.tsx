'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Utensils, Timer } from 'lucide-react'

export type EditablePost = {
  id: string
  title: string
  description?: string | null
  difficulty?: string | null
  cookTime?: number | null
  prepTime?: number | null
}

/** Owner-only edit dialog for a recipe or reel's title/caption (+ a few recipe-only fields). */
export function EditPostModal({
  open,
  onClose,
  type,
  post,
}: {
  open: boolean
  onClose: () => void
  type: 'recipe' | 'reel'
  post: EditablePost | null
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState('EASY')
  const [cookTime, setCookTime]     = useState('')
  const [prepTime, setPrepTime]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (!open || !post) return
    setTitle(post.title)
    setDescription(post.description ?? '')
    setDifficulty(post.difficulty ?? 'EASY')
    setCookTime(post.cookTime != null ? String(post.cookTime) : '')
    setPrepTime(post.prepTime != null ? String(post.prepTime) : '')
    setError(null)
  }, [open, post])

  if (!mounted || !post) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving || !post) return
    if (!title.trim()) { setError('Title is required'); return }

    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
      }
      if (type === 'recipe') {
        body.difficulty = difficulty
        body.cookTime = cookTime ? Number(cookTime) : null
        body.prepTime = prepTime ? Number(prepTime) : null
      }

      const res = await fetch(type === 'recipe' ? `/api/recipes/${post.id}` : `/api/reels/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Update failed')

      onClose()
      router.refresh()
    } catch {
      setError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors'
  const inputStyle = {
    background: 'var(--cr-bg-surface)',
    color: 'var(--cr-text-1)',
    border: '1px solid var(--cr-border)',
  }
  const labelCls = 'text-xs font-semibold mb-1.5 block'

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="edit-post-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
              key="edit-post-modal"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[85dvh] rounded-2xl overflow-hidden flex flex-col"
              style={{ background: 'var(--cr-bg-card)', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
            >
              <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--cr-border)' }}>
                <h2 className="text-lg font-bold" style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}>
                  Edit {type === 'recipe' ? 'Recipe' : 'Reel'}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
                  {error && (
                    <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                      {error}
                    </p>
                  )}

                  <div>
                    <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Title *</label>
                    <input
                      className={inputCls}
                      style={inputStyle}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>
                      {type === 'recipe' ? 'Description' : 'Caption'}
                    </label>
                    <textarea
                      className={inputCls + ' resize-none min-h-[80px]'}
                      style={inputStyle}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>

                  {type === 'recipe' && (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Difficulty</label>
                        <select className={inputCls} style={inputStyle} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                          <option value="EASY">Easy</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HARD">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Cook (min)</label>
                        <div className="relative">
                          <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--cr-text-muted)' }} />
                          <input type="number" min="1" className={inputCls} style={{ ...inputStyle, paddingLeft: '2rem' }} value={cookTime} onChange={e => setCookTime(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Prep (min)</label>
                        <div className="relative">
                          <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--cr-text-muted)' }} />
                          <input type="number" min="1" className={inputCls} style={{ ...inputStyle, paddingLeft: '2rem' }} value={prepTime} onChange={e => setPrepTime(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={saving}
                    whileHover={{ scale: saving ? 1 : 1.02 }}
                    whileTap={{ scale: saving ? 1 : 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-md mt-2"
                    style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A', opacity: saving ? 0.7 : 1 }}
                  >
                    <Utensils className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
