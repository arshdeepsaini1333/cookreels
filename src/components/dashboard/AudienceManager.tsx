'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, X, Check, Users,
  Smartphone, Monitor, Tablet, Globe, Cpu, Edit2, Trash2,
  AlertCircle, Loader2, Map as MapIcon,
} from 'lucide-react'
import type {
  Audience, AudienceGender, AudienceDeviceType, AudienceOS, AudienceLocation, AudienceLocationType,
} from '@/types/campaign'

const LocationMapPicker = dynamic(() => import('./LocationMapPicker'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl flex items-center justify-center text-xs mt-2" style={{ height: 220, background: 'rgba(120,120,120,0.08)', color: '#9CA3AF' }}>
      Loading map…
    </div>
  ),
})

// ─── Static data ────────────────────────────────────────────────────────────

const INTEREST_OPTIONS = [
  'Cooking', 'Baking', 'Recipes', 'Street Food', 'Fine Dining', 'Fast Food',
  'Vegan & Plant-Based', 'Healthy Eating', 'Desserts & Sweets', 'Beverages & Drinks',
  'Regional Cuisine', 'BBQ & Grilling', 'Kitchen Gadgets', 'Food Photography', 'Restaurant Reviews',
]

const BEHAVIOUR_OPTIONS = [
  'Frequent Restaurant Visitors', 'Online Food Orderers', 'Home Cooks', 'Grocery Shoppers',
  'Kitchen Appliance Buyers', 'Food Delivery Subscribers', 'Meal Kit Subscribers',
  'Food Bloggers & Influencers', 'Coffee Shop Regulars', 'Health-Conscious Eaters',
]

const COUNTRIES = ['India', 'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Singapore', 'UAE', 'Brazil', 'Japan']
const STATES    = ['Punjab', 'Haryana', 'Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Kerala', 'Bihar', 'Andhra Pradesh']
const CITIES    = ['Mumbai', 'Delhi', 'Bengaluru', 'Chandigarh', 'Mohali', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Panchkula', 'Kochi', 'Goa', 'Noida', 'Gurugram']
const DISTRICTS = ['Ludhiana', 'Amritsar', 'Patiala', 'Gurdaspur', 'Sangrur', 'Bathinda', 'Faridkot', 'Hoshiarpur']

const LOCATION_DATASET: AudienceLocation[] = [
  ...COUNTRIES.map(value => ({ type: 'country' as const, value })),
  ...STATES.map(value => ({ type: 'state' as const, value })),
  ...CITIES.map(value => ({ type: 'city' as const, value })),
  ...DISTRICTS.map(value => ({ type: 'district' as const, value })),
]

const LOCATION_TYPE_LABEL: Record<AudienceLocationType, string> = {
  country: 'Country', state: 'State', city: 'City', district: 'District', pincode: 'Pincode',
}

const GENDER_OPTIONS: { id: AudienceGender; label: string; emoji: string }[] = [
  { id: 'all',    label: 'All Genders', emoji: '👥' },
  { id: 'male',   label: 'Male',        emoji: '👨' },
  { id: 'female', label: 'Female',      emoji: '👩' },
]

const DEVICE_OPTIONS: { id: AudienceDeviceType; label: string; Icon: React.ElementType }[] = [
  { id: 'all',     label: 'All Devices', Icon: Globe },
  { id: 'mobile',  label: 'Mobile',      Icon: Smartphone },
  { id: 'desktop', label: 'Desktop',     Icon: Monitor },
  { id: 'tablet',  label: 'Tablet',      Icon: Tablet },
]

const OS_OPTIONS: { id: AudienceOS; label: string; Icon: React.ElementType }[] = [
  { id: 'all',     label: 'All OS',  Icon: Globe },
  { id: 'android', label: 'Android', Icon: Smartphone },
  { id: 'ios',     label: 'iOS',     Icon: Smartphone },
  { id: 'windows', label: 'Windows', Icon: Monitor },
  { id: 'macos',   label: 'macOS',   Icon: Monitor },
  { id: 'linux',   label: 'Linux',   Icon: Cpu },
]

// ─── Reach estimate (placeholder heuristic) ──────────────────────────────────

function estimateReach(a: Pick<Audience, 'locations' | 'interests' | 'behaviours' | 'ageMin' | 'ageMax' | 'gender' | 'deviceType' | 'os'>): number {
  const base = 8_000
  const locFactor       = a.locations.length * 42_000
  const interestFactor  = a.interests.length * 6_000
  const behaviourFactor = a.behaviours.length * 4_000
  const ageSpan      = Math.max(1, a.ageMax - a.ageMin)
  const genderFactor = a.gender === 'all' ? 1 : 0.55
  const deviceFactor = a.deviceType === 'all' ? 1 : 0.7
  const osFactor     = a.os === 'all' ? 1 : 0.6
  return Math.round((base + locFactor + interestFactor + behaviourFactor) * (ageSpan / 47) * genderFactor * deviceFactor * osFactor)
}

function fmtReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtAgeRange(min: number, max: number): string {
  return `${min} – ${max >= 65 ? '65+' : max}`
}

// ─── Dual-range age slider ────────────────────────────────────────────────────

function AgeRangeSlider({ min, max, valueMin, valueMax, onChange, isDark }: {
  min: number
  max: number
  valueMin: number
  valueMax: number
  onChange: (min: number, max: number) => void
  isDark: boolean
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold" style={{ color: '#F5C518' }}>
          {valueMin} — {valueMax >= max ? `${max}+` : valueMax}
        </span>
      </div>
      <div className="dual-range relative" style={{ height: 20 }}>
        <div className="absolute top-1/2 left-0 right-0 h-1.5 -translate-y-1/2 rounded-full" style={{ background: isDark ? '#343438' : '#E8E8E8' }} />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ left: `${pct(valueMin)}%`, right: `${100 - pct(valueMax)}%`, background: 'linear-gradient(90deg, #F5C518, #FFB800)' }}
        />
        <input
          type="range" min={min} max={max} value={valueMin}
          onChange={e => onChange(Math.min(Number(e.target.value), valueMax), valueMax)}
          className="absolute w-full top-0 m-0"
          style={{ height: 20, zIndex: valueMin >= max - 4 ? 5 : 3 }}
        />
        <input
          type="range" min={min} max={max} value={valueMax}
          onChange={e => onChange(valueMin, Math.max(Number(e.target.value), valueMin))}
          className="absolute w-full top-0 m-0"
          style={{ height: 20, zIndex: 4 }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[11px]" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        <span>{min}</span>
        <span>{max}+</span>
      </div>
    </div>
  )
}

// ─── Location autocomplete + chips ───────────────────────────────────────────

function LocationPicker({ locations, onChange, isDark }: {
  locations: AudienceLocation[]
  onChange: (next: AudienceLocation[]) => void
  isDark: boolean
}) {
  const [activeType, setActiveType] = useState<AudienceLocationType>('city')
  const [query, setQuery] = useState('')
  const [showMap, setShowMap] = useState(false)

  const suggestions = activeType === 'pincode'
    ? []
    : LOCATION_DATASET.filter(l =>
        l.type === activeType &&
        l.value.toLowerCase().includes(query.toLowerCase()) &&
        !locations.some(sel => sel.type === l.type && sel.value === l.value)
      )

  const addLocation = (type: AudienceLocationType, value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (locations.some(l => l.type === type && l.value.toLowerCase() === trimmed.toLowerCase())) { setQuery(''); return }
    onChange([...locations, { type, value: trimmed }])
    setQuery('')
  }

  const removeLocation = (type: AudienceLocationType, value: string) => {
    onChange(locations.filter(l => !(l.type === type && l.value === value)))
  }

  const inputStyle = { background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#F5F5F5' : '#1A1A1A' }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1.5">
        {(['country', 'state', 'city', 'district', 'pincode'] as AudienceLocationType[]).map(t => (
          <button
            key={t} type="button"
            onClick={() => { setActiveType(t); setQuery('') }}
            className="py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={activeType === t
              ? { background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A' }
              : { background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#A1A1AA' : '#666' }}
          >
            {LOCATION_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
        <input
          value={query}
          onChange={e => setQuery(activeType === 'pincode' ? e.target.value.replace(/[^0-9]/g, '').slice(0, 6) : e.target.value)}
          placeholder={activeType === 'pincode' ? 'Type a 6-digit pincode and press Enter…' : `Search ${LOCATION_TYPE_LABEL[activeType].toLowerCase()}…`}
          onKeyDown={e => { if (e.key === 'Enter' && activeType === 'pincode' && query.length === 6) addLocation('pincode', query) }}
          className="w-full rounded-xl pl-8 pr-3.5 py-2.5 text-sm outline-none"
          style={inputStyle}
        />
        {activeType !== 'pincode' && query && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-xl overflow-hidden" style={{ border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, maxHeight: 180, overflowY: 'auto', background: isDark ? '#1E1E1F' : '#fff' }}>
            {suggestions.slice(0, 8).map(s => (
              <button
                key={`${s.type}-${s.value}`} type="button"
                onClick={() => addLocation(s.type, s.value)}
                className="w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between"
                style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', background: isDark ? 'rgba(30,30,31,0.90)' : '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.80)' : 'rgba(245,197,24,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = isDark ? 'rgba(30,30,31,0.90)' : '#fff')}
              >
                {s.value}
              </button>
            ))}
          </div>
        )}
      </div>

      {locations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {locations.map(l => (
            <span key={`${l.type}-${l.value}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(245,197,24,0.15)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.30)' }}>
              {l.value}
              <button type="button" onClick={() => removeLocation(l.type, l.value)} className="ml-0.5 hover:opacity-70 transition-opacity"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setShowMap(s => !s)} className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80" style={{ color: '#F5C518' }}>
        <MapIcon size={13} /> {showMap ? 'Hide map' : 'Pick on map'}
      </button>
      {showMap && activeType !== 'district' && (
        <LocationMapPicker locationType={activeType as 'city' | 'state' | 'country' | 'pincode'} onAdd={v => addLocation(activeType, v)} isDark={isDark} />
      )}
      {showMap && activeType === 'district' && (
        <p className="text-xs mt-1" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Map lookup isn&apos;t available for districts — search or type the name instead.</p>
      )}
    </div>
  )
}

// ─── Generic searchable multi-select chips ───────────────────────────────────

function ChipMultiSelect({ options, selected, onChange, placeholder, isDark }: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder: string
  isDark: boolean
}) {
  const [query, setQuery] = useState('')
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
  const toggle = (opt: string) => onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt])

  return (
    <div className="space-y-2.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(245,197,24,0.15)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.30)' }}>
              {s}
              <button type="button" onClick={() => toggle(s)} className="ml-0.5 hover:opacity-70 transition-opacity"><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
        <input
          value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder}
          className="w-full rounded-xl pl-8 pr-3.5 py-2.5 text-sm outline-none"
          style={{ background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#F5F5F5' : '#1A1A1A' }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filtered.map(o => {
          const active = selected.includes(o)
          return (
            <button
              key={o} type="button" onClick={() => toggle(o)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={active
                ? { background: 'rgba(245,197,24,0.20)', border: '1px solid rgba(245,197,24,0.50)', color: '#F5C518' }
                : { background: isDark ? 'rgba(30,30,31,0.80)' : '#F5F5F5', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#A1A1AA' : '#666' }}
            >
              {o}
            </button>
          )
        })}
        {filtered.length === 0 && <p className="text-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>No matches.</p>}
      </div>
    </div>
  )
}

// ─── Generic single-select cards ─────────────────────────────────────────────

function SingleSelectCards<T extends string>({ options, value, onChange, isDark, columns = 3 }: {
  options: { id: T; label: string; emoji?: string; Icon?: React.ElementType }[]
  value: T
  onChange: (v: T) => void
  isDark: boolean
  columns?: number
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {options.map(opt => {
        const active = value === opt.id
        return (
          <button
            key={opt.id} type="button" onClick={() => onChange(opt.id)}
            className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl text-xs font-semibold transition-all"
            style={active
              ? { background: 'rgba(245,197,24,0.15)', border: '1.5px solid rgba(245,197,24,0.55)', color: '#F5C518' }
              : { background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)', border: `1.5px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#A1A1AA' : '#666' }}
          >
            {opt.emoji ? <span className="text-xl leading-none">{opt.emoji}</span> : opt.Icon ? <opt.Icon size={18} /> : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Modal section wrapper ────────────────────────────────────────────────────

function ModalSection({ num, title, subtitle, required, isDark, children }: {
  num: string
  title: string
  subtitle?: string
  required?: boolean
  isDark: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-bold" style={{ color: '#F5C518' }}>{num}</span>
        <h3 className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
          {title}{required && <span style={{ color: '#FF6B6B' }}> *</span>}
        </h3>
      </div>
      {subtitle
        ? <p className="text-xs mb-2.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{subtitle}</p>
        : <div className="mb-2.5" />
      }
      {children}
    </div>
  )
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────

interface AudienceFormState {
  name: string
  gender: AudienceGender
  ageMin: number
  ageMax: number
  locations: AudienceLocation[]
  interests: string[]
  behaviours: string[]
  deviceType: AudienceDeviceType
  os: AudienceOS
}

const EMPTY_FORM: AudienceFormState = {
  name: '', gender: 'all', ageMin: 18, ageMax: 65, locations: [], interests: [], behaviours: [], deviceType: 'all', os: 'all',
}

function toForm(a: Audience): AudienceFormState {
  return { name: a.name, gender: a.gender, ageMin: a.ageMin, ageMax: a.ageMax, locations: a.locations, interests: a.interests, behaviours: a.behaviours, deviceType: a.deviceType, os: a.os }
}

function AudienceModal({ editing, onClose, onSaved, isDark }: {
  editing: Audience | null
  onClose: () => void
  onSaved: (a: Audience) => void
  isDark: boolean
}) {
  const [form, setForm] = useState<AudienceFormState>(editing ? toForm(editing) : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const upd = <K extends keyof AudienceFormState>(key: K, val: AudienceFormState[K]) => setForm(f => ({ ...f, [key]: val }))

  const errors: Record<string, string> = {
    ...(!form.name.trim() && { name: 'Audience name is required.' }),
    ...(form.locations.length === 0 && { locations: 'Please add at least one target location.' }),
  }
  const visibleErrors = attempted ? errors : {}

  const handleSubmit = async () => {
    setAttempted(true)
    if (Object.keys(errors).length > 0) return
    setSaving(true)
    setError('')
    try {
      const url = editing ? `/api/audiences/${editing.id}` : '/api/audiences'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json() as Audience & { error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to save audience'); setSaving(false); return }
      onSaved(data)
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  const border = isDark ? '#343438' : '#E8E8E8'

  if (!mounted) return null

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', zIndex: 99999 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="w-full my-6 flex flex-col"
        style={{ maxWidth: 820, maxHeight: '92vh', background: isDark ? '#1A1A1B' : '#fff', border: `1px solid ${border}`, borderRadius: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.40)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.30)' }}>
            <Users size={16} style={{ color: '#F5C518' }} />
          </div>
          <h2 className="text-base font-bold flex-1" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
            {editing ? 'Edit Audience' : 'Create Audience'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-80" style={{ background: isDark ? 'rgba(52,52,56,0.60)' : 'rgba(0,0,0,0.06)', color: isDark ? '#A1A1AA' : '#666' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.30)', color: '#FF6B6B' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <ModalSection num="01" title="Audience Name" required isDark={isDark}>
            <input
              value={form.name}
              maxLength={60}
              onChange={e => upd('name', e.target.value)}
              placeholder="e.g. Mumbai Mobile Users 25–40"
              className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
              style={{ background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)', border: `1px solid ${visibleErrors.name ? '#FF6B6B' : border}`, color: isDark ? '#F5F5F5' : '#1A1A1A' }}
            />
            <div className="flex items-center justify-between mt-1.5">
              {visibleErrors.name ? <span className="text-xs" style={{ color: '#FF6B6B' }}>{visibleErrors.name}</span> : <span />}
              <span className="text-[11px] font-medium" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{form.name.length} / 60</span>
            </div>
          </ModalSection>

          <ModalSection num="02" title="Gender" required isDark={isDark}>
            <SingleSelectCards options={GENDER_OPTIONS} value={form.gender} onChange={v => upd('gender', v)} isDark={isDark} columns={3} />
          </ModalSection>

          <ModalSection num="03" title="Age Range" required isDark={isDark}>
            <AgeRangeSlider min={18} max={65} valueMin={form.ageMin} valueMax={form.ageMax} onChange={(mn, mx) => setForm(f => ({ ...f, ageMin: mn, ageMax: mx }))} isDark={isDark} />
          </ModalSection>

          <ModalSection num="04" title="Target Locations" required isDark={isDark}>
            <LocationPicker locations={form.locations} onChange={v => upd('locations', v)} isDark={isDark} />
            {visibleErrors.locations && <p className="text-xs mt-1.5" style={{ color: '#FF6B6B' }}>{visibleErrors.locations}</p>}
          </ModalSection>

          <ModalSection num="05" title="Interests" subtitle="Target users based on the content they engage with." isDark={isDark}>
            <ChipMultiSelect options={INTEREST_OPTIONS} selected={form.interests} onChange={v => upd('interests', v)} placeholder="Search interests…" isDark={isDark} />
          </ModalSection>

          <ModalSection num="06" title="Behaviours" subtitle="Reach users based on real-world habits." isDark={isDark}>
            <ChipMultiSelect options={BEHAVIOUR_OPTIONS} selected={form.behaviours} onChange={v => upd('behaviours', v)} placeholder="Search behaviours…" isDark={isDark} />
          </ModalSection>

          <ModalSection num="07" title="Device & Operating System" isDark={isDark}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: isDark ? '#A1A1AA' : '#666' }}>Device Type</p>
                <SingleSelectCards options={DEVICE_OPTIONS} value={form.deviceType} onChange={v => upd('deviceType', v)} isDark={isDark} columns={4} />
              </div>
              <div>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: isDark ? '#A1A1AA' : '#666' }}>Operating System</p>
                <SingleSelectCards options={OS_OPTIONS} value={form.os} onChange={v => upd('os', v)} isDark={isDark} columns={3} />
              </div>
            </div>
          </ModalSection>
        </div>

        {/* Sticky footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${border}` }}>
          <button onClick={onClose} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40" style={{ background: isDark ? 'rgba(52,52,56,0.80)' : '#F5F5F5', color: isDark ? '#A1A1AA' : '#666' }}>
            Cancel
          </button>
          <motion.button
            whileHover={saving ? {} : { scale: 1.02 }} whileTap={saving ? {} : { scale: 0.97 }}
            onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 4px 16px rgba(245,197,24,0.35)' }}
          >
            {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : editing ? 'Save Changes' : 'Create Audience'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}

// ─── The one audience card ────────────────────────────────────────────────────

function AudienceCard({ audience, onEdit, onDelete, isDark }: {
  audience: Audience
  onEdit: () => void
  onDelete: () => void
  isDark: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const gender = GENDER_OPTIONS.find(g => g.id === audience.gender)
  const device = DEVICE_OPTIONS.find(d => d.id === audience.deviceType)
  const os     = OS_OPTIONS.find(o => o.id === audience.os)

  const rows: [string, string][] = [
    ['Gender', gender?.label ?? 'All Genders'],
    ['Age Range', fmtAgeRange(audience.ageMin, audience.ageMax)],
    ['Total Locations', String(audience.locations.length)],
    ['Estimated Reach', `~${fmtReach(estimateReach(audience))} (estimate)`],
    ['Interests Count', String(audience.interests.length)],
    ['Behaviours Count', String(audience.behaviours.length)],
    ['Device Type', device?.label ?? 'All Devices'],
    ['Operating System', os?.label ?? 'All OS'],
  ]

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
        border: '2px solid #F5C518',
        boxShadow: '0 0 0 3px rgba(245,197,24,0.15)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,197,24,0.15)' }}>
          <Users size={16} style={{ color: '#F5C518' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Audience</p>
          <p className="text-sm font-bold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{audience.name}</p>
        </div>
        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F5C518' }}>
          <Check size={11} style={{ color: '#1A1A1A' }} strokeWidth={3} />
        </div>
      </div>

      <div className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{label}</span>
            <span className="font-semibold text-right" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
          style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A' }}
        >
          <Edit2 size={12} /> Edit Audience
        </button>
        <button
          onClick={() => { if (confirmDelete) { onDelete() } else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000) } }}
          title={confirmDelete ? 'Click again to confirm' : 'Delete'}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
          style={confirmDelete ? { background: 'rgba(255,107,107,0.20)', color: '#FF6B6B' } : { background: isDark ? 'rgba(30,30,31,0.80)' : '#F5F5F5', color: isDark ? '#A1A1AA' : '#666' }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main: AudienceStep ───────────────────────────────────────────────────────

export interface SelectedAudienceRef { id: string; name: string }

export default function AudienceStep({ selected, onChange, isDark, errorMessage }: {
  selected: SelectedAudienceRef | null
  onChange: (next: SelectedAudienceRef | null) => void
  isDark: boolean
  errorMessage?: string
}) {
  const [audience, setAudience] = useState<Audience | null>(null)
  const [loading, setLoading] = useState(!!selected)
  const [modalOpen, setModalOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!selected) { setAudience(null); setLoading(false); return }
    if (audience?.id === selected.id) return
    setLoading(true)
    fetch(`/api/audiences/${selected.id}`)
      .then(r => r.json())
      .then((d: Audience) => setAudience(d))
      .catch(() => setActionError('Failed to load audience.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  const handleSaved = (a: Audience) => {
    setAudience(a)
    onChange({ id: a.id, name: a.name })
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (!audience) return
    setActionError('')
    try {
      const res = await fetch(`/api/audiences/${audience.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json() as { error?: string }; setActionError(d.error ?? 'Failed to delete audience'); return }
      setAudience(null)
      onChange(null)
    } catch {
      setActionError('Network error while deleting audience.')
    }
  }

  const cardStyle = {
    background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
    backdropFilter: 'blur(20px)',
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium" style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.30)', color: '#FF6B6B' }}>
          <AlertCircle size={13} /> {actionError}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl h-48 animate-pulse" style={{ background: isDark ? 'rgba(52,52,56,0.40)' : 'rgba(0,0,0,0.04)' }} />
      ) : !audience ? (
        <div className="rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3" style={cardStyle}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,197,24,0.10)' }}>
            <Users size={26} style={{ color: '#F5C518', opacity: 0.6 }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>Create Audience</p>
            <p className="text-xs mt-1" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Define who this campaign should reach.</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap mt-1"
            style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 4px 16px rgba(245,197,24,0.35)' }}
          >
            <Plus size={14} /> Create Audience
          </motion.button>
          {errorMessage && (
            <div className="flex items-center gap-2 text-xs font-medium mt-1" style={{ color: '#FF6B6B' }}>
              <AlertCircle size={13} /> {errorMessage}
            </div>
          )}
        </div>
      ) : (
        <AudienceCard audience={audience} onEdit={() => setModalOpen(true)} onDelete={handleDelete} isDark={isDark} />
      )}

      <AnimatePresence>
        {modalOpen && (
          <AudienceModal
            editing={audience}
            onClose={() => setModalOpen(false)}
            onSaved={handleSaved}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
