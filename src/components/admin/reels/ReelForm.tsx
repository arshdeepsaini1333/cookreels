'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Upload } from 'lucide-react'
import { uploadToS3 } from '@/lib/uploadTos3'
import { ReelThumbnail } from '@/components/shared/ReelThumbnail'

type Category = { id: string; name: string; slug: string; emoji: string | null; group: string | null }

export type ReelFormValues = {
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  duration: string
  gradient: string
  emoji: string
  categoryIds: string[]
  isPublished: boolean
  isTrending: boolean
  isBanned: boolean
}

const EMPTY_VALUES: ReelFormValues = {
  title: '',
  description: '',
  videoUrl: '',
  thumbnailUrl: '',
  duration: '',
  gradient: '',
  emoji: '',
  categoryIds: [],
  isPublished: true,
  isTrending: false,
  isBanned: false,
}

interface ReelFormProps {
  reelId: string
  initialValues: Partial<ReelFormValues>
}

const inputClass = 'w-full rounded-xl py-2.5 px-3.5 text-sm outline-none transition-colors focus:border-[var(--cr-accent)]'
const inputStyle = { background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)' }
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]'
const checkboxLabelClass = 'flex items-center gap-2 text-sm font-medium text-[var(--cr-text-1)]'

export function ReelForm({ reelId, initialValues }: ReelFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<ReelFormValues>({ ...EMPTY_VALUES, ...initialValues })
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
  }, [])

  function set<K extends keyof ReelFormValues>(key: K, value: ReelFormValues[K]) {
    setValues(v => ({ ...v, [key]: value }))
  }

  function toggleCategory(id: string) {
    setValues(v => ({
      ...v,
      categoryIds: v.categoryIds.includes(id) ? v.categoryIds.filter(c => c !== id) : [...v.categoryIds, id],
    }))
  }

  async function handleVideoUpload(file: File) {
    setUploadingVideo(true)
    setError(null)
    try {
      const url = await uploadToS3(file, 'reels')
      set('videoUrl', url)
    } catch {
      setError('Video upload failed. Please try again.')
    } finally {
      setUploadingVideo(false)
    }
  }

  async function handleThumbUpload(file: File) {
    setUploadingThumb(true)
    setError(null)
    try {
      const url = await uploadToS3(file, 'reels')
      set('thumbnailUrl', url)
    } catch {
      setError('Thumbnail upload failed. Please try again.')
    } finally {
      setUploadingThumb(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      title: values.title,
      description: values.description || null,
      videoUrl: values.videoUrl,
      thumbnailUrl: values.thumbnailUrl || null,
      duration: values.duration ? Number(values.duration) : null,
      gradient: values.gradient || null,
      emoji: values.emoji || null,
      categoryIds: values.categoryIds,
      isPublished: values.isPublished,
      isTrending: values.isTrending,
      isBanned: values.isBanned,
    }

    try {
      const res = await fetch(`/api/admin/reels/${reelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Something went wrong')
        setSubmitting(false)
        return
      }
      router.push(`/admin/reels/${reelId}`)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl p-3.5 text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}>
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className={labelClass}>Title</label>
        <input required maxLength={200} value={values.title} onChange={e => set('title', e.target.value)} className={inputClass} style={inputStyle} />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea rows={4} value={values.description} onChange={e => set('description', e.target.value)} className={inputClass} style={inputStyle} />
      </div>

      <div>
        <label className={labelClass}>Cover</label>
        <div className="flex items-start gap-4">
          {values.videoUrl && (
            <div className="relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-xl" style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)' }}>
              <ReelThumbnail videoUrl={values.videoUrl} thumbnailUrl={values.thumbnailUrl || null} />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors" style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-2)' }}>
                {uploadingVideo ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploadingVideo ? 'Uploading…' : values.videoUrl ? 'Replace video' : 'Upload video'}
                <input type="file" accept="video/*" className="hidden" disabled={uploadingVideo} onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f) }} />
              </label>
              <span className="text-xs text-[var(--cr-text-muted)]">Video</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors" style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-2)' }}>
                {uploadingThumb ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploadingThumb ? 'Uploading…' : values.thumbnailUrl ? 'Replace thumbnail' : 'Upload custom thumbnail'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingThumb} onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f) }} />
              </label>
              <span className="text-xs text-[var(--cr-text-muted)]">
                {values.thumbnailUrl ? 'Custom image' : 'Falls back to a video frame'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Duration (seconds)</label>
          <input type="number" min="0" value={values.duration} onChange={e => set('duration', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Gradient (CSS)</label>
          <input value={values.gradient} onChange={e => set('gradient', e.target.value)} placeholder="linear-gradient(...)" className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Emoji</label>
          <input value={values.emoji} onChange={e => set('emoji', e.target.value)} maxLength={8} className={inputClass} style={inputStyle} />
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <label className={labelClass}>Categories</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => {
              const active = values.categoryIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={active
                    ? { background: 'var(--cr-accent)', color: 'var(--cr-btn-text)' }
                    : { background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-2)' }}
                >
                  {c.emoji ? `${c.emoji} ` : ''}{c.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-5 rounded-xl p-4" style={{ background: 'var(--cr-accent-soft)' }}>
        <label className={checkboxLabelClass}>
          <input type="checkbox" checked={values.isPublished} onChange={e => set('isPublished', e.target.checked)} className="h-4 w-4" />
          Published
        </label>
        <label className={checkboxLabelClass}>
          <input type="checkbox" checked={values.isTrending} onChange={e => set('isTrending', e.target.checked)} className="h-4 w-4" />
          Trending
        </label>
        <label className={checkboxLabelClass} style={{ color: values.isBanned ? '#EF4444' : undefined }}>
          <input type="checkbox" checked={values.isBanned} onChange={e => set('isBanned', e.target.checked)} className="h-4 w-4" />
          Banned
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || uploadingVideo || uploadingThumb}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--cr-accent) 0%, var(--cr-accent-2) 100%)', color: 'var(--cr-btn-text)' }}
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Save Changes
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-2)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
