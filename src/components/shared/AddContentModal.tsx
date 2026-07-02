'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Image, Video, Utensils, Timer,
} from 'lucide-react'
import { uploadToS3 } from '@/lib/uploadTos3'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbCategory {
  id: string
  name: string
  slug: string
  emoji: string | null
  group: string | null
  sortOrder: number
}

// ─── CategoryPicker ───────────────────────────────────────────────────────────

function CategoryPicker({
  selected,
  onChange,
  categories,
  loading,
}: {
  selected: Set<string>
  onChange: (next: Set<string>) => void
  categories: DbCategory[]
  loading: boolean
}) {
  const toggle = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(g => (
          <div key={g}>
            <div className="h-2.5 w-20 rounded-full mb-2 animate-pulse" style={{ background: 'var(--cr-border)' }} />
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 5 + g }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 rounded-full animate-pulse"
                  style={{ width: `${48 + (i % 3) * 16}px`, background: 'var(--cr-border)' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Group categories by their `group` field; ungrouped → "Other"
  const grouped = categories.reduce<Record<string, DbCategory[]>>((acc, cat) => {
    const key = cat.group ?? 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(cat)
    return acc
  }, {})

  const groupEntries = Object.entries(grouped)

  if (groupEntries.length === 0) {
    return <p className="text-xs py-2" style={{ color: 'var(--cr-text-muted)' }}>No categories available.</p>
  }

  return (
    <div className="space-y-3">
      {groupEntries.map(([groupName, items]) => (
        <div key={groupName}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--cr-text-muted)' }}>
            {groupName}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map(item => {
              const active = selected.has(item.id)
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => toggle(item.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                  style={
                    active
                      ? { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A', boxShadow: '0 2px 8px rgba(245,197,24,0.35)' }
                      : { background: 'var(--cr-bg-surface)', color: 'var(--cr-text-2)', border: '1px solid var(--cr-border)' }
                  }
                >
                  {item.emoji && <span>{item.emoji}</span>}
                  {item.name}
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── FileDropZone ─────────────────────────────────────────────────────────────

function FileDropZone({
  accept,
  icon,
  hint,
  preview,
  onFile,
}: {
  accept: string
  icon: React.ReactNode
  hint: string
  preview: string | null
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handle = (file: File | undefined) => {
    if (file) onFile(file)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
      className="relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{
        border: `2px dashed ${dragging ? 'var(--cr-accent)' : 'var(--cr-border)'}`,
        background: dragging ? 'var(--cr-accent-soft)' : 'var(--cr-bg-surface)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => handle(e.target.files?.[0])}
      />

      {preview ? (
        accept.startsWith('video') ? (
          <video src={preview} className="w-full max-h-48 object-contain" muted playsInline />
        ) : (
          <img src={preview} alt="preview" className="w-full max-h-48 object-contain" />
        )
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--cr-accent-soft)' }}>
            {icon}
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--cr-text-1)' }}>
            Click or drag & drop
          </p>
          <p className="text-xs" style={{ color: 'var(--cr-text-muted)' }}>{hint}</p>
        </div>
      )}

      {preview && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
          <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-full">Change file</span>
        </div>
      )}
    </div>
  )
}

// ─── AddContentModal ──────────────────────────────────────────────────────────

type ContentType = 'recipe' | 'reel'

export function AddContentModal({
  open,
  onClose,
  userId,
  initialType = 'recipe',
}: {
  open: boolean
  onClose: () => void
  userId: string
  initialType?: ContentType
}) {
  const router = useRouter()
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Portal to document.body — mounting inline would nest this modal inside
  // DashboardLayout's `relative z-10` content wrapper, which traps its z-index
  // inside that local stacking context and lets the bottom nav paint over it.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => {
      setToast(null)
      if (ok) { onClose(); router.refresh() }
    }, 2000)
  }

  const [type, setType] = useState<ContentType>(initialType)
  // Reset to the requested tab each time the modal opens (e.g. FAB's "Upload Reel" vs "Add Recipe").
  useEffect(() => { if (open) setType(initialType) }, [open, initialType])
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())

  // ── Fetch categories from DB when modal opens ──────────────────────────────
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setCategoriesLoading(true)
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setCategoriesLoading(false))
  }, [open])

  const [recipeTitle,  setRecipeTitle]  = useState('')
  const [recipeDesc,   setRecipeDesc]   = useState('')
  const [difficulty,   setDifficulty]   = useState('EASY')
  const [cookTime,     setCookTime]     = useState('')
  const [prepTime,     setPrepTime]     = useState('')
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [reelTitle,    setReelTitle]    = useState('')
  const [reelDesc,     setReelDesc]     = useState('')
  const [videoFile,    setVideoFile]    = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)

  const [isUploading, setIsUploading] = useState(false)

  const handlePhoto = (file: File) => {
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleVideo = (file: File) => {
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  const handleClose = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setPhotoFile(null); setPhotoPreview(null)
    setVideoFile(null); setVideoPreview(null)
    setRecipeTitle(''); setRecipeDesc(''); setCookTime(''); setPrepTime('')
    setReelTitle(''); setReelDesc('')
    setSelectedCategories(new Set())
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isUploading) return

    try {
      setIsUploading(true)

      if (type === 'recipe') {
        if (!photoFile) { showToast('Please select a cover photo', false); return }
        if (!recipeTitle.trim()) { showToast('Please enter a recipe title', false); return }

        const imageUrl = await uploadToS3(photoFile, 'recipes')
        const categoryIds = Array.from(selectedCategories)
        const selectedCatObjects = categories.filter(c => categoryIds.includes(c.id))
        const isVeg = selectedCatObjects.some(c =>
          ['vegetarian', 'vegan'].includes(c.slug.toLowerCase())
        )
        const response = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: recipeTitle.trim(),
            description: recipeDesc.trim(),
            coverImage: imageUrl,
            cookTime: cookTime ? Number(cookTime) : null,
            prepTime: prepTime ? Number(prepTime) : null,
            difficulty,
            isVeg,
            categoryIds,
          }),
        })
        if (!response.ok) throw new Error('Recipe creation failed')
        showToast('Recipe posted successfully!', true)
      }

      if (type === 'reel') {
        if (!videoFile) { showToast('Please select a video', false); return }
        if (!reelTitle.trim()) { showToast('Please enter a reel title', false); return }

        const videoUrl = await uploadToS3(videoFile, 'reels')
        const duration = await new Promise<number>(resolve => {
          const video = document.createElement('video')
          video.preload = 'metadata'
          video.onloadedmetadata = () => resolve(Math.floor(video.duration))
          video.src = URL.createObjectURL(videoFile)
        })

        const response = await fetch('/api/reels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: reelTitle.trim(),
            description: reelDesc.trim(),
            videoUrl,
            duration,
            categoryIds: Array.from(selectedCategories),
          }),
        })
        if (!response.ok) throw new Error('Reel creation failed')
        showToast('Reel posted successfully!', true)
      }
    } catch (error) {
      console.error(error)
      showToast('Upload failed. Please try again.', false)
    } finally {
      setIsUploading(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors'
  const inputStyle = {
    background: 'var(--cr-bg-surface)',
    color: 'var(--cr-text-1)',
    border: '1px solid var(--cr-border)',
  }
  const labelCls = 'text-xs font-semibold mb-1.5 block'

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="add-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />

          {/* Centering wrapper — flex-centers the card within the viewport so it can
               never extend past the screen edge (the old top/maxHeight calc formulas
               didn't always add up to <=100dvh, letting the card overflow the bottom). */}
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            onClick={handleClose}
          >
            <motion.div
              key="add-modal"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[85dvh] rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'var(--cr-bg-card)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
              }}
            >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}>
                Add Content
              </h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Type selector */}
              <div className="flex gap-2 px-5 pt-4">
                {(['recipe', 'reel'] as ContentType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={
                      type === t
                        ? { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }
                        : { background: 'var(--cr-bg-surface)', color: 'var(--cr-text-2)', border: '1px solid var(--cr-border)' }
                    }
                  >
                    {t === 'recipe' ? <Utensils className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    {t === 'recipe' ? 'Recipe' : 'Reel'}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4 pb-6">
                {type === 'recipe' ? (
                  <>
                    <div>
                      <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Cover Photo *</label>
                      <FileDropZone
                        accept="image/*"
                        icon={<Image className="w-5 h-5" style={{ color: 'var(--cr-accent)' }} />}
                        hint="JPG, PNG, WEBP — up to 10 MB"
                        preview={photoPreview}
                        onFile={handlePhoto}
                      />
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Recipe Title *</label>
                      <div className="relative">
                        <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--cr-text-muted)' }} />
                        <input
                          className={inputCls}
                          style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                          placeholder="e.g. Spicy Butter Chicken"
                          value={recipeTitle}
                          onChange={e => setRecipeTitle(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Description</label>
                      <textarea
                        className={inputCls + ' resize-none min-h-[72px]'}
                        style={inputStyle}
                        placeholder="Describe your recipe..."
                        value={recipeDesc}
                        onChange={e => setRecipeDesc(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>
                        Category
                        {selectedCategories.size > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--cr-accent)', color: '#1A1A1A' }}>
                            {selectedCategories.size} selected
                          </span>
                        )}
                      </label>
                      <CategoryPicker selected={selectedCategories} onChange={setSelectedCategories} categories={categories} loading={categoriesLoading} />
                    </div>

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
                          <input type="number" min="1" className={inputCls} style={{ ...inputStyle, paddingLeft: '2rem' }} placeholder="30" value={cookTime} onChange={e => setCookTime(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Prep (min)</label>
                        <div className="relative">
                          <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--cr-text-muted)' }} />
                          <input type="number" min="1" className={inputCls} style={{ ...inputStyle, paddingLeft: '2rem' }} placeholder="10" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Video *</label>
                      <FileDropZone
                        accept="video/*"
                        icon={<Video className="w-5 h-5" style={{ color: 'var(--cr-accent)' }} />}
                        hint="MP4, MOV, WEBM — up to 200 MB"
                        preview={videoPreview}
                        onFile={handleVideo}
                      />
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Reel Title *</label>
                      <div className="relative">
                        <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--cr-text-muted)' }} />
                        <input
                          className={inputCls}
                          style={{ ...inputStyle, paddingLeft: '2.25rem' }}
                          placeholder="e.g. 60-Second Pasta"
                          value={reelTitle}
                          onChange={e => setReelTitle(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>Caption</label>
                      <textarea
                        className={inputCls + ' resize-none min-h-[72px]'}
                        style={inputStyle}
                        placeholder="Write a caption..."
                        value={reelDesc}
                        onChange={e => setReelDesc(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={labelCls} style={{ color: 'var(--cr-text-muted)' }}>
                        Category
                        {selectedCategories.size > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--cr-accent)', color: '#1A1A1A' }}>
                            {selectedCategories.size} selected
                          </span>
                        )}
                      </label>
                      <CategoryPicker selected={selectedCategories} onChange={setSelectedCategories} categories={categories} loading={categoriesLoading} />
                    </div>
                  </>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-md mt-2"
                  style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                >
                  <Plus className="w-4 h-4" />
                  {isUploading
                    ? 'Uploading...'
                    : type === 'recipe'
                    ? 'Post Recipe'
                    : 'Post Reel'}
                </motion.button>
              </form>
            </div>
            </motion.div>
          </div>

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                key="upload-toast"
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold"
                style={{
                  background: toast.ok ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                  color: '#fff',
                  minWidth: '220px',
                  boxShadow: toast.ok ? '0 8px 32px rgba(34,197,94,0.35)' : '0 8px 32px rgba(239,68,68,0.35)',
                }}
              >
                <span className="text-lg">{toast.ok ? '✓' : '✕'}</span>
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
