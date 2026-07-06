'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import type { CampaignObjective } from '@/generated/prisma'

const OBJECTIVES: { value: CampaignObjective; label: string }[] = [
  { value: 'LEADS',            label: 'Leads' },
  { value: 'WEBSITE_TRAFFIC',  label: 'Website Traffic' },
  { value: 'APP_INSTALLS',     label: 'App Installs' },
  { value: 'VIDEO_VIEWS',      label: 'Video Views' },
  { value: 'PROFILE_VISITS',   label: 'Profile Visits' },
  { value: 'BRAND_AWARENESS',  label: 'Brand Awareness' },
  { value: 'ENGAGEMENT',       label: 'Engagement' },
  { value: 'REACH',            label: 'Reach' },
  { value: 'CONVERSIONS',      label: 'Conversions' },
]

export type CampaignFormValues = {
  advertiser?: string
  name: string
  objective: CampaignObjective
  dailyBudget: string
  totalBudget: string
  durationDays: string
  impressions: string
  startDate: string
  endDate: string
  ageMin: string
  ageMax: string
  gender: string
  locations: string
  bannerUrl: string
  adVideoUrl: string
}

const EMPTY_VALUES: CampaignFormValues = {
  advertiser: '',
  name: '',
  objective: 'BRAND_AWARENESS',
  dailyBudget: '',
  totalBudget: '',
  durationDays: '',
  impressions: '',
  startDate: '',
  endDate: '',
  ageMin: '',
  ageMax: '',
  gender: '',
  locations: '',
  bannerUrl: '',
  adVideoUrl: '',
}

interface CampaignFormProps {
  mode: 'create' | 'edit'
  campaignId?: string
  initialValues?: Partial<CampaignFormValues>
}

const inputClass = 'w-full rounded-xl py-2.5 px-3.5 text-sm outline-none transition-colors focus:border-[var(--cr-accent)]'
const inputStyle = { background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)' }
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]'

export function CampaignForm({ mode, campaignId, initialValues }: CampaignFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<CampaignFormValues>({ ...EMPTY_VALUES, ...initialValues })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof CampaignFormValues>(key: K, value: CampaignFormValues[K]) {
    setValues(v => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      name: values.name,
      objective: values.objective,
      durationDays: Number(values.durationDays),
      dailyBudget: Number(values.dailyBudget),
      totalBudget: Number(values.totalBudget),
      impressions: Number(values.impressions),
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      ageMin: values.ageMin ? Number(values.ageMin) : null,
      ageMax: values.ageMax ? Number(values.ageMax) : null,
      gender: values.gender || null,
      locations: values.locations ? values.locations.split(',').map(s => s.trim()).filter(Boolean) : [],
      bannerUrl: values.bannerUrl || null,
      adVideoUrl: values.adVideoUrl || null,
    }
    if (mode === 'create') payload.advertiser = values.advertiser

    try {
      const res = await fetch(
        mode === 'create' ? '/api/admin/campaigns' : `/api/admin/campaigns/${campaignId}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const body = await res.json().catch(() => ({})) as { error?: string; id?: string }
      if (!res.ok) {
        setError(body.error ?? 'Something went wrong')
        setSubmitting(false)
        return
      }
      router.push(`/admin/campaigns/${mode === 'create' ? body.id : campaignId}`)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div
          className="flex items-start gap-2.5 rounded-xl p-3.5 text-sm"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mode === 'create' && (
        <div>
          <label className={labelClass}>Advertiser (email or username)</label>
          <input
            required
            value={values.advertiser}
            onChange={e => set('advertiser', e.target.value)}
            placeholder="advertiser@example.com"
            className={inputClass}
            style={inputStyle}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Campaign name</label>
          <input
            required
            maxLength={100}
            value={values.name}
            onChange={e => set('name', e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass}>Objective</label>
          <select
            value={values.objective}
            onChange={e => set('objective', e.target.value as CampaignObjective)}
            className={inputClass}
            style={inputStyle}
          >
            {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Daily budget (₹)</label>
          <input required type="number" min="1" step="0.01" value={values.dailyBudget} onChange={e => set('dailyBudget', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Total budget (₹)</label>
          <input required type="number" min="1" step="0.01" value={values.totalBudget} onChange={e => set('totalBudget', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Duration (days)</label>
          <input required type="number" min="1" value={values.durationDays} onChange={e => set('durationDays', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Impressions target</label>
          <input required type="number" min="1" value={values.impressions} onChange={e => set('impressions', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Start date</label>
          <input type="date" value={values.startDate} onChange={e => set('startDate', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>End date</label>
          <input type="date" value={values.endDate} onChange={e => set('endDate', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Min age</label>
          <input type="number" min="13" max="100" value={values.ageMin} onChange={e => set('ageMin', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Max age</label>
          <input type="number" min="13" max="100" value={values.ageMax} onChange={e => set('ageMax', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Gender</label>
          <select value={values.gender} onChange={e => set('gender', e.target.value)} className={inputClass} style={inputStyle}>
            <option value="">Not set</option>
            <option value="all">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Target locations (comma separated)</label>
        <input value={values.locations} onChange={e => set('locations', e.target.value)} placeholder="Mumbai, Delhi, Bengaluru" className={inputClass} style={inputStyle} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Banner URL</label>
          <input value={values.bannerUrl} onChange={e => set('bannerUrl', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className={labelClass}>Ad video URL</label>
          <input value={values.adVideoUrl} onChange={e => set('adVideoUrl', e.target.value)} className={inputClass} style={inputStyle} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-opacity disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, var(--cr-accent) 0%, var(--cr-accent-2) 100%)', color: 'var(--cr-btn-text)' }}
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          {mode === 'create' ? 'Create Campaign' : 'Save Changes'}
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
