'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, AlertCircle, Upload } from 'lucide-react'
import { uploadToS3 } from '@/lib/uploadTos3'
import type { Difficulty } from '@/generated/prisma'

type Category = { id: string; name: string; slug: string; emoji: string | null; group: string | null }

export type RecipeFormValues = {
  title: string
  description: string
  coverImage: string
  cuisine: string
  cookTime: string
  prepTime: string
  servings: string
  calories: string
  difficulty: Difficulty | ''
  isVeg: boolean
  categoryIds: string[]
  isPublished: boolean
  isTrending: boolean
  isBanned: boolean
}

const EMPTY_VALUES: RecipeFormValues = {
  title: '',
  description: '',
  coverImage: '',
  cuisine: '',
  cookTime: '',
  prepTime: '',
  servings: '',
  calories: '',
  difficulty: '',
  isVeg: false,
  categoryIds: [],
  isPublished: true,
  isTrending: false,
  isBanned: false,
}

interface RecipeFormProps {
  recipeId: string
  initialValues: Partial<RecipeFormValues>
}

const inputClass = 'w-full rounded-xl py-2.5 px-3.5 text-sm outline-none transition-colors focus:border-[var(--cr-accent)]'
const inputStyle = { background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)' }
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]'
const checkboxLabelClass = 'flex items-center gap-2 text-sm font-medium text-[var(--cr-text-1)]'

export function RecipeForm({ recipeId, initialValues }: RecipeFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<RecipeFormValues>({ ...EMPTY_VALUES, ...initialValues })
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
  }, [])

  function set<K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) {
    setValues(v => ({ ...v, [key]: value }))
  }

  function toggleCategory(id: string) {
    setValues(v => ({
      ...v,
      categoryIds: v.categoryIds.includes(id) ? v.categoryIds.filter(c => c !== id) : [...v.categoryIds, id],
    }))
  }

  async function handleCoverUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const url = await uploadToS3(file, 'recipes')
      set('coverImage', url)
    } catch {
      setError('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      title: values.title,
      description: values.description || null,
      coverImage: values.coverImage || null,
      cuisine: values.cuisine || null,
      cookTime: values.cookTime ? Number(values.cookTime) : null,
      prepTime: values.prepTime ? Number(values.prepTime) : null,
      servings: values.servings ? Number(values.servings) : null,
      calories: values.calories ? Number(values.calories) : null,
      difficulty: values.difficulty || null,
      isVeg: values.isVeg,
      categoryIds: values.categoryIds,
      isPublished: values.isPublished,
      isTrending: values.isTrending,
      isBanned: values.isBanned,
    }

    try {
      const res = await fetch(`/api/admin/recipes/${recipeId}`, {
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
      router.push(`/admin/recipes/${recipeId}`)
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
        <textarea rows={5} value={values.description} onChange={e => set('description', e.target.value)} className={inputClass} style={inputStyle} />
      </div>

      <div>
        <label className={labelClass}>Cover image</label>
        <div className="flex items-center gap-4">
          {values.coverImage && (
            <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl">
              <Image src={values.coverImage} alt="Cover" fill className="object-cover" unoptimized />
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors" style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-2)' }}>
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'Uploading…' : 'Upload image'}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f) }} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Cuisine</label>
          <input value={values.cuisine} onChange={e => set('cuisine', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Difficulty</label>
          <select value={values.difficulty} onChange={e => set('difficulty', e.target.value as Difficulty | '')} className={inputClass} style={inputStyle}>
            <option value="">Not set</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div className="flex items-end pb-2.5">
          <label className={checkboxLabelClass}>
            <input type="checkbox" checked={values.isVeg} onChange={e => set('isVeg', e.target.checked)} className="h-4 w-4" />
            Vegetarian
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className={labelClass}>Prep time (min)</label>
          <input type="number" min="0" value={values.prepTime} onChange={e => set('prepTime', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Cook time (min)</label>
          <input type="number" min="0" value={values.cookTime} onChange={e => set('cookTime', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Servings</label>
          <input type="number" min="0" value={values.servings} onChange={e => set('servings', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Calories</label>
          <input type="number" min="0" value={values.calories} onChange={e => set('calories', e.target.value)} className={inputClass} style={inputStyle} />
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
          disabled={submitting || uploading}
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
