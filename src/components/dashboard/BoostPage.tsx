'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import {
  Megaphone, Globe, MapPin, Check, Upload, X,
  ChevronDown, Plus, Trash2, Target, BarChart2,
  Play, Image as ImageIcon, Video, TrendingUp, Rocket,
  AlertCircle, CheckCircle2, Monitor, Share2, ArrowLeft,
  Loader2, FileText,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import AudienceStep, { type SelectedAudienceRef } from './AudienceManager'
import { uploadToS3 } from '@/lib/uploadTos3'

// ─── Razorpay global type ─────────────────────────────────────────────────────
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void; on(event: string, cb: (r: Record<string, string>) => void): void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window.Razorpay !== 'undefined') { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = 'cookreels' | 'meta' | 'google' | 'geofencing' | ''
type AdFormat = 'banner' | 'reel'
type MobileStep = 1 | 2 | 3 | 4 | 5 | 6

interface GeofenceZone {
  id: string
  name: string
  lat: string
  lng: string
  radius: string
}

interface MediaInfo {
  size: string
  type: string
  dimensions?: string
  duration?: string
  aspectRatio?: string
}

interface CampaignState {
  platform: Platform
  campaignName: string
  objective: string
  description: string
  adFormat: AdFormat
  mediaFile: File | null
  mediaPreviewUrl: string | null
  mediaInfo: MediaInfo | null
  geofences: GeofenceZone[]
  startDate: string
  endDate: string
  timezone: string
  ctaText: string
  destinationUrl: string
  // ── CookReels platform only ──
  selectedAudience: SelectedAudienceRef | null
  adHeading: string
  impressions: number
}

// ─── Pricing (USD display, INR charged via Razorpay) ─────────────────────────

// 1 impression = ₹0.10; ₹1 = $0.012  →  1 impression = $0.0012
const INR_PER_IMPRESSION = 0.10
const INR_TO_USD         = 0.012
const USD_PER_IMPRESSION = INR_PER_IMPRESSION * INR_TO_USD   // 0.0012

function impressionsToUSD(impressions: number): number {
  return impressions * USD_PER_IMPRESSION
}

function impressionsToINR(impressions: number): number {
  return impressions * INR_PER_IMPRESSION
}

function formatUSD(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000)     return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return `$${amount.toFixed(2)}`
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const OBJECTIVES: { label: string; value: string }[] = [
  { label: 'Leads',            value: 'LEADS' },
  { label: 'Website Traffic',  value: 'WEBSITE_TRAFFIC' },
  { label: 'App Installs',     value: 'APP_INSTALLS' },
  { label: 'Video Views',      value: 'VIDEO_VIEWS' },
  { label: 'Profile Visits',   value: 'PROFILE_VISITS' },
  { label: 'Brand Awareness',  value: 'BRAND_AWARENESS' },
  { label: 'Engagement',       value: 'ENGAGEMENT' },
  { label: 'Reach',            value: 'REACH' },
  { label: 'Conversions',      value: 'CONVERSIONS' },
]

const RADIUS_OPTIONS = ['100m', '250m', '500m', '1km', '5km', '10km']

const CTA_OPTIONS = ['Learn More', 'Shop Now', 'Order Now', 'Visit Website', 'Download App', 'Book Now', 'Get Offer', 'Subscribe']

const PLATFORMS = [
  {
    id: 'cookreels' as Platform,
    name: 'CookReels Ads',
    desc: 'Reach food lovers exclusively — across Feeds, Reels, Explore, Search and Category pages. A food-first audience with high purchase intent.',
    features: ['In-Feed & Reel Ads', 'Explore & Search Placement', 'Food-Intent Audience'],
    icon: Megaphone,
    color: '#F5C518',
    badge: 'Best Value',
  },
  {
    id: 'meta' as Platform,
    name: 'Meta Ads',
    desc: 'Run ads across Facebook News Feed, Instagram Feed, Reels and Stories. Massive social reach with advanced interest and demographic targeting.',
    features: ['Instagram & Facebook Feed', 'Reels & Stories Ads', 'Interest Targeting'],
    icon: Share2,
    color: '#E1306C',
    badge: 'Popular',
  },
  {
    id: 'google' as Platform,
    name: 'Google Ads',
    desc: 'Capture demand on Google Search, Shopping, Display Network and YouTube pre-roll. Keyword targeting for high-intent food and restaurant searches.',
    features: ['Search & Shopping Ads', 'YouTube Pre-Roll', 'Display Network'],
    icon: Monitor,
    color: '#4285F4',
    badge: 'High Reach',
  },
  {
    id: 'geofencing' as Platform,
    name: 'Geofencing Ads',
    desc: 'Draw virtual fences around restaurants, malls, events and competitor locations. Serve ads on mobile, OTT/CTV and web to real-world nearby visitors.',
    features: ['Competitor Targeting', 'OTT / CTV Ads', 'Mobile & Web Reach'],
    icon: MapPin,
    color: '#7DBB91',
    badge: 'Hyper-Local',
  },
]

const MOBILE_STEPS = [
  { step: 1 as MobileStep, label: 'Platform' },
  { step: 2 as MobileStep, label: 'Creative' },
  { step: 3 as MobileStep, label: 'Audience' },
  { step: 4 as MobileStep, label: 'Budget' },
  { step: 5 as MobileStep, label: 'Preview' },
  { step: 6 as MobileStep, label: 'Launch' },
]

// ─── Input / Label helpers ────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children, isDark }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  isDark: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        backdropFilter: 'blur(20px)',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(52,52,56,0.80)'
          : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(245,197,24,0.15)' }}
        >
          <Icon size={16} style={{ color: '#F5C518' }} />
        </div>
        <h3 className="text-base font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  )
}

function Label({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: isDark ? '#A1A1AA' : '#666666' }}>
      {children}
    </label>
  )
}

function Input({ isDark, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { isDark: boolean }) {
  return (
    <input
      {...props}
      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
      style={{
        background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        color: isDark ? '#F5F5F5' : '#1A1A1A',
      }}
      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(245,197,24,0.60)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,197,24,0.12)' }}
      onBlur={e => { e.currentTarget.style.border = `1px solid ${isDark ? '#343438' : '#E8E8E8'}`; e.currentTarget.style.boxShadow = 'none' }}
    />
  )
}

function Select({ isDark, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { isDark: boolean }) {
  return (
    <div className="relative">
      <select
        {...props}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none appearance-none transition-all pr-9"
        style={{
          background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)',
          border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
          color: isDark ? '#F5F5F5' : '#1A1A1A',
        }}
        onFocus={e => { e.currentTarget.style.border = '1px solid rgba(245,197,24,0.60)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,197,24,0.12)' }}
        onBlur={e => { e.currentTarget.style.border = `1px solid ${isDark ? '#343438' : '#E8E8E8'}`; e.currentTarget.style.boxShadow = 'none' }}
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
    </div>
  )
}

function Textarea({ isDark, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { isDark: boolean }) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all resize-none"
      style={{
        background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        color: isDark ? '#F5F5F5' : '#1A1A1A',
      }}
      onFocus={e => { e.currentTarget.style.border = '1px solid rgba(245,197,24,0.60)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,197,24,0.12)' }}
      onBlur={e => { e.currentTarget.style.border = `1px solid ${isDark ? '#343438' : '#E8E8E8'}`; e.currentTarget.style.boxShadow = 'none' }}
    />
  )
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#FF6B6B' }}>
      <AlertCircle size={11} /> {children}
    </p>
  )
}

// ─── Platform Selector ────────────────────────────────────────────────────────

function CampaignTypeSelector({ value, onChange, isDark }: {
  value: Platform
  onChange: (p: Platform) => void
  isDark: boolean
}) {
  return (
    <SectionCard title="Campaign Network" icon={Globe} isDark={isDark}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PLATFORMS.map(p => {
          const Icon = p.icon
          const isSelected = value === p.id
          return (
            <motion.button
              key={p.id}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(p.id)}
              className="relative text-left rounded-2xl p-4 transition-all"
              style={{
                background: isSelected
                  ? (isDark ? 'rgba(43,43,45,0.90)' : 'rgba(255,255,255,0.95)')
                  : (isDark ? 'rgba(30,30,31,0.60)' : 'rgba(245,245,245,0.60)'),
                border: isSelected
                  ? `2px solid ${p.id === 'cookreels' ? '#F5C518' : p.color}`
                  : `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                boxShadow: isSelected
                  ? `0 0 0 3px ${p.id === 'cookreels' ? 'rgba(245,197,24,0.15)' : `${p.color}25`}, 0 8px 24px rgba(0,0,0,0.12)`
                  : 'none',
              }}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: p.id === 'cookreels' ? '#F5C518' : p.color }}
                >
                  <Check size={11} className="text-white" strokeWidth={3} />
                </motion.div>
              )}
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${p.color}20`, border: `1px solid ${p.color}40` }}
                >
                  <Icon size={20} style={{ color: p.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
                      {p.name}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${p.color}20`, color: p.color }}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
                    {p.desc}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.features.map(f => (
                      <span key={f} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: `${p.color}14`, color: p.color, border: `1px solid ${p.color}28` }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ─── Geofencing Builder ───────────────────────────────────────────────────────

function GeofencingBuilder({ state, update, isDark }: {
  state: CampaignState
  update: (k: keyof CampaignState, v: unknown) => void
  isDark: boolean
}) {
  const addZone = () => {
    update('geofences', [...state.geofences, {
      id: Math.random().toString(36).slice(2),
      name: '', lat: '28.6139', lng: '77.2090', radius: '1km',
    }])
  }

  const updateZone = (id: string, field: keyof GeofenceZone, val: string) => {
    update('geofences', state.geofences.map(z => z.id === id ? { ...z, [field]: val } : z))
  }

  const removeZone = (id: string) => {
    update('geofences', state.geofences.filter(z => z.id !== id))
  }

  return (
    <SectionCard title="Geofencing Zones" icon={MapPin} isDark={isDark}>
      <p className="text-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        Add physical locations to target users in a specific area. Each zone can have an independent radius.
      </p>

      <div className="space-y-3">
        {state.geofences.map((zone, idx) => (
          <motion.div
            key={zone.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 space-y-3"
            style={{ background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(245,245,245,0.70)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#F5C518' }}>Zone {idx + 1}</span>
              <button onClick={() => removeZone(zone.id)} className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:opacity-70">
                <Trash2 size={13} style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
              </button>
            </div>
            <div>
              <Label isDark={isDark}>Location Name</Label>
              <Input isDark={isDark} placeholder="e.g. Connaught Place" value={zone.name} onChange={e => updateZone(zone.id, 'name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label isDark={isDark}>Latitude</Label>
                <Input isDark={isDark} placeholder="28.6139" value={zone.lat} onChange={e => updateZone(zone.id, 'lat', e.target.value)} />
              </div>
              <div>
                <Label isDark={isDark}>Longitude</Label>
                <Input isDark={isDark} placeholder="77.2090" value={zone.lng} onChange={e => updateZone(zone.id, 'lng', e.target.value)} />
              </div>
            </div>
            <div>
              <Label isDark={isDark}>Radius</Label>
              <div className="flex gap-2 flex-wrap">
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => updateZone(zone.id, 'radius', r)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={zone.radius === r ? {
                      background: 'rgba(245,197,24,0.20)',
                      border: '1px solid rgba(245,197,24,0.50)',
                      color: '#F5C518',
                    } : {
                      background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(255,255,255,0.80)',
                      border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                      color: isDark ? '#A1A1AA' : '#666',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {/* Map preview */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{ height: 120, background: isDark ? '#1A2340' : '#E8F0FE', border: `1px solid ${isDark ? '#343438' : '#CBD5E1'}` }}
            >
              {/* Fake map grid */}
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: `linear-gradient(${isDark ? '#4285F425' : '#4285F430'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#4285F425' : '#4285F430'} 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />
              {/* Roads simulation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-full h-px opacity-30" style={{ background: isDark ? '#4285F4' : '#4285F4' }} />
                <div className="absolute w-px h-full opacity-30" style={{ background: isDark ? '#4285F4' : '#4285F4' }} />
              </div>
              {/* Radius circle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="rounded-full border-2 flex items-center justify-center"
                  style={{
                    width: 60, height: 60,
                    borderColor: '#F5C518',
                    background: 'rgba(245,197,24,0.15)',
                  }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: '#F5C518', boxShadow: '0 0 8px rgba(245,197,24,0.80)' }} />
                </div>
              </div>
              <div
                className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                style={{ background: 'rgba(0,0,0,0.60)', color: '#fff' }}
              >
                {zone.name || 'Unnamed Zone'} · {zone.radius}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={addZone}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
        style={{
          border: '1.5px dashed rgba(245,197,24,0.40)',
          color: '#F5C518',
          background: 'rgba(245,197,24,0.05)',
        }}
      >
        <Plus size={15} /> Add Geofence Zone
      </button>
    </SectionCard>
  )
}

// ─── CookReels: Campaign Details ─────────────────────────────────────────────

function CampaignDetailsCard({ state, update, isDark, errors }: {
  state: CampaignState
  update: (k: keyof CampaignState, v: unknown) => void
  isDark: boolean
  errors: Record<string, string>
}) {
  return (
    <SectionCard title="Campaign Details" icon={BarChart2} isDark={isDark}>
      <div>
        <Label isDark={isDark}>Campaign Name</Label>
        <Input isDark={isDark} placeholder="e.g. Summer Food Festival 2025" value={state.campaignName} onChange={e => update('campaignName', e.target.value)} />
        {errors.campaignName && <ErrorText>{errors.campaignName}</ErrorText>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label isDark={isDark}>Start Date</Label>
          <Input isDark={isDark} type="date" value={state.startDate} onChange={e => update('startDate', e.target.value)} />
        </div>
        <div>
          <Label isDark={isDark}>End Date</Label>
          <Input isDark={isDark} type="date" value={state.endDate} onChange={e => update('endDate', e.target.value)} />
        </div>
      </div>
      {errors.endDate && <ErrorText>{errors.endDate}</ErrorText>}
      <div>
        <Label isDark={isDark}>Number of Impressions</Label>
        <p className="text-xs mb-2" style={{ color: isDark ? '#A1A1AA' : '#666666' }}>
          Each impression costs <span className="font-semibold" style={{ color: '#F5C518' }}>₹0.10 (10 paisa)</span>. Enter how many impressions you&apos;d like to buy.
        </p>
        <input
          type="number"
          min={0}
          step={100}
          value={state.impressions || ''}
          onChange={e => update('impressions', Math.max(0, Math.round(Number(e.target.value))))}
          placeholder="e.g. 50000"
          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
          style={{
            background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)',
            border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
            color: isDark ? '#F5F5F5' : '#1A1A1A',
          }}
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[10_000, 25_000, 50_000, 100_000, 250_000, 500_000].map(n => (
            <button
              key={n}
              onClick={() => update('impressions', n)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={state.impressions === n ? {
                background: 'rgba(245,197,24,0.20)',
                border: '1px solid rgba(245,197,24,0.50)',
                color: '#F5C518',
              } : {
                background: isDark ? 'rgba(30,30,31,0.80)' : '#F5F5F5',
                border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                color: isDark ? '#A1A1AA' : '#666',
              }}
            >
              {n >= 100_000 ? `${n / 100_000}L` : `${n / 1_000}K`}
            </button>
          ))}
        </div>
        {errors.budget && <ErrorText>{errors.budget}</ErrorText>}
        {state.impressions > 0 && (
          <div className="flex items-center justify-between mt-3 rounded-xl px-3.5 py-2.5" style={{ background: 'rgba(245,197,24,0.08)', border: '1px solid rgba(245,197,24,0.25)' }}>
            <span className="text-xs font-semibold" style={{ color: isDark ? '#A1A1AA' : '#666666' }}>Estimated Cost</span>
            <span className="text-sm font-bold" style={{ color: '#F5C518' }}>{formatINR(impressionsToINR(state.impressions))}</span>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ─── CookReels: Objective ─────────────────────────────────────────────────────

function ObjectiveCard({ state, update, isDark, errors }: {
  state: CampaignState
  update: (k: keyof CampaignState, v: unknown) => void
  isDark: boolean
  errors: Record<string, string>
}) {
  return (
    <SectionCard title="Campaign Objective" icon={Target} isDark={isDark}>
      <div>
        <Label isDark={isDark}>Objective</Label>
        <Select isDark={isDark} value={state.objective} onChange={e => update('objective', e.target.value)}>
          <option value="">Select objective…</option>
          {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        {errors.objective && <ErrorText>{errors.objective}</ErrorText>}
      </div>
    </SectionCard>
  )
}

// ─── Media Uploader ───────────────────────────────────────────────────────────

function MediaUploader({ state, update, isDark }: {
  state: CampaignState
  update: (k: keyof CampaignState, v: unknown) => void
  isDark: boolean
}) {
  const isBanner = state.adFormat === 'banner'

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const sizeKB = file.size / 1024
    const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(0)} KB`
    update('mediaFile', file)
    update('mediaPreviewUrl', url)
    const info: MediaInfo = { size: sizeStr, type: file.type }

    if (file.type.startsWith('image/')) {
      const img = new window.Image()
      img.onload = () => {
        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
        const g = gcd(img.naturalWidth, img.naturalHeight)
        update('mediaInfo', {
          ...info,
          dimensions: `${img.naturalWidth}×${img.naturalHeight}px`,
          aspectRatio: `${img.naturalWidth / g}:${img.naturalHeight / g}`,
        })
      }
      img.src = url
    } else if (file.type.startsWith('video/')) {
      const vid = document.createElement('video')
      vid.onloadedmetadata = () => {
        const mins = Math.floor(vid.duration / 60)
        const secs = Math.floor(vid.duration % 60)
        update('mediaInfo', {
          ...info,
          duration: `${mins}:${String(secs).padStart(2, '0')}`,
          dimensions: `${vid.videoWidth}×${vid.videoHeight}px`,
        })
      }
      vid.src = url
    }
  }, [update])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: isBanner
      ? { 'image/jpeg': [], 'image/png': [], 'image/webp': [] }
      : { 'video/mp4': [], 'video/quicktime': [], 'video/webm': [] },
    maxSize: isBanner ? 10 * 1024 * 1024 : 100 * 1024 * 1024,
    multiple: false,
  })

  return (
    <div className="space-y-4">
      {/* Format toggle */}
      <div className="flex gap-2">
        {(['banner', 'reel'] as AdFormat[]).map(fmt => (
          <button
            key={fmt}
            onClick={() => { update('adFormat', fmt); update('mediaFile', null); update('mediaPreviewUrl', null); update('mediaInfo', null) }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={state.adFormat === fmt ? {
              background: 'linear-gradient(135deg, #F5C518, #FFB800)',
              color: '#1A1A1A',
              boxShadow: '0 4px 16px rgba(245,197,24,0.35)',
            } : {
              background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)',
              border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
              color: isDark ? '#A1A1AA' : '#666666',
            }}
          >
            {fmt === 'banner' ? <ImageIcon size={14} /> : <Video size={14} />}
            {fmt === 'banner' ? 'Banner Ad' : 'Reel / Video Ad'}
          </button>
        ))}
      </div>

      <p className="text-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        {isBanner ? 'Supported: JPG, PNG, WEBP · Max 10 MB' : 'Supported: MP4, MOV, WEBM · Max 100 MB'}
      </p>

      {/* Drop zone */}
      {!state.mediaPreviewUrl ? (
        <div
          {...getRootProps()}
          className="relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
          style={{
            borderColor: isDragActive ? '#F5C518' : (isDark ? '#343438' : '#E8E8E8'),
            background: isDragActive
              ? 'rgba(245,197,24,0.06)'
              : (isDark ? 'rgba(30,30,31,0.40)' : 'rgba(245,245,245,0.40)'),
          }}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.25)' }}
            >
              <Upload size={22} style={{ color: '#F5C518' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
                {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs mt-1" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
                {isBanner ? 'JPG, PNG or WEBP up to 10 MB' : 'MP4, MOV or WEBM up to 100 MB'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden relative" style={{ border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}` }}>
          {isBanner ? (
            <img src={state.mediaPreviewUrl} alt="preview" className="w-full max-h-64 object-contain" style={{ background: isDark ? '#1E1E1F' : '#F5F5F5' }} />
          ) : (
            <video src={state.mediaPreviewUrl} controls className="w-full max-h-64 object-contain" style={{ background: '#000' }} />
          )}
          <button
            onClick={() => { update('mediaFile', null); update('mediaPreviewUrl', null); update('mediaInfo', null) }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.70)' }}
          >
            <X size={14} className="text-white" />
          </button>
          {state.mediaInfo && (
            <div
              className="p-3 grid grid-cols-2 gap-2"
              style={{ background: isDark ? 'rgba(30,30,31,0.90)' : 'rgba(245,245,245,0.90)' }}
            >
              {(([
                ['Size', state.mediaInfo.size],
                ['Type', state.mediaInfo.type.split('/')[1]?.toUpperCase() ?? ''],
                state.mediaInfo.dimensions ? ['Dimensions', state.mediaInfo.dimensions] : null,
                state.mediaInfo.duration ? ['Duration', state.mediaInfo.duration] : null,
                state.mediaInfo.aspectRatio ? ['Aspect Ratio', state.mediaInfo.aspectRatio] : null,
              ] as (string[] | null)[]).filter((x): x is string[] => x !== null)).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{k}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CookReels: Ad Set ─────────────────────────────────────────────────────────

function AdSetCard({ state, update, isDark, errors }: {
  state: CampaignState
  update: (k: keyof CampaignState, v: unknown) => void
  isDark: boolean
  errors: Record<string, string>
}) {
  return (
    <SectionCard title="Ad Set" icon={FileText} isDark={isDark}>
      <div>
        <Label isDark={isDark}>Ad Heading</Label>
        <Input isDark={isDark} placeholder="e.g. Fresh Recipes Delivered Daily" value={state.adHeading} onChange={e => update('adHeading', e.target.value)} />
        {errors.adHeading && <ErrorText>{errors.adHeading}</ErrorText>}
      </div>
      <div>
        <Label isDark={isDark}>Ad Description</Label>
        <Textarea isDark={isDark} rows={3} placeholder="Describe your campaign goals and key message…" value={state.description} onChange={e => update('description', e.target.value)} />
        {errors.adDescription && <ErrorText>{errors.adDescription}</ErrorText>}
      </div>
      <div>
        <Label isDark={isDark}>Ad Creative</Label>
        <MediaUploader state={state} update={update} isDark={isDark} />
        {errors.mediaFile && <ErrorText>{errors.mediaFile}</ErrorText>}
      </div>
      <div>
        <Label isDark={isDark}>Call to Action Button</Label>
        <Select isDark={isDark} value={state.ctaText} onChange={e => update('ctaText', e.target.value)}>
          {CTA_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div>
        <Label isDark={isDark}>Destination Link (optional)</Label>
        <Input
          isDark={isDark}
          type="url"
          placeholder="https://yourwebsite.com"
          value={state.destinationUrl}
          onChange={e => update('destinationUrl', e.target.value)}
        />
        <p className="text-xs mt-1.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
          Where should people land when they tap the CTA button? Leave blank to link to your CookReels profile.
        </p>
      </div>
    </SectionCard>
  )
}

// ─── Ad Preview Panel ─────────────────────────────────────────────────────────

function AdPreviewPanel({ state, isDark }: { state: CampaignState; isDark: boolean }) {
  const [activeTab, setActiveTab] = useState<'feed' | 'reel' | 'search' | 'display' | 'map'>('feed')
  const hasMedia = !!state.mediaPreviewUrl
  const isBanner = state.adFormat === 'banner'

  const platformTabs: Record<Platform, { id: string; label: string }[]> = {
    cookreels: [{ id: 'feed', label: 'Feed' }, { id: 'reel', label: 'Reel' }],
    meta: [{ id: 'feed', label: 'FB Feed' }, { id: 'reel', label: 'Instagram' }],
    google: [{ id: 'search', label: 'Search' }, { id: 'display', label: 'Display' }],
    geofencing: [{ id: 'map', label: 'Map View' }],
    '': [{ id: 'feed', label: 'Preview' }],
  }

  const tabs = platformTabs[state.platform] || platformTabs['']

  const PreviewFrame = () => {
    const campaignName = state.campaignName || 'Your Campaign'
    const ctaLabel = state.ctaText || 'Learn More'

    if (activeTab === 'reel' && state.platform !== 'google') {
      return (
        <div
          className="relative rounded-2xl overflow-hidden mx-auto"
          style={{ width: 200, height: 355, background: '#000' }}
        >
          {hasMedia && !isBanner ? (
            <video src={state.mediaPreviewUrl!} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover" />
          ) : hasMedia && isBanner ? (
            <img src={state.mediaPreviewUrl!} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
              <Play size={32} className="text-white opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 gradient-cinematic" />
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full" style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)' }} />
              <span className="text-white text-[10px] font-semibold">{state.campaignName || 'YourBrand'}</span>
              <span className="text-white/60 text-[9px]">· Sponsored</span>
            </div>
            <p className="text-white text-[10px] leading-relaxed">{campaignName}</p>
            <button className="w-full py-1.5 rounded-lg text-[11px] font-bold text-[#1A1A1A]" style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)' }}>
              {ctaLabel}
            </button>
          </div>
          {/* Side actions */}
          <div className="absolute right-2 bottom-20 flex flex-col gap-3 items-center">
            {['❤️', '💬', '↗️'].map((icon, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-lg">{icon}</span>
                <span className="text-white text-[9px]">{['2.4K', '318', '891'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (activeTab === 'search') {
      return (
        <div className="space-y-2 mx-auto max-w-xs">
          <div
            className="rounded-xl p-3"
            style={{ background: isDark ? '#1E1E1F' : '#fff', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}` }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Monitor size={12} style={{ color: '#4285F4' }} />
              <span className="text-[10px]" style={{ color: '#4285F4' }}>google.com</span>
              <span
                className="ml-auto text-[9px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: '#e8f0fe', color: '#4285F4' }}
              >Ad</span>
            </div>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#1558d6' }}>{campaignName}</p>
            <p className="text-[10px]" style={{ color: isDark ? '#9CA3AF' : '#202124' }}>
              {state.description || 'Discover amazing products and experiences. Click to learn more and get started today.'}
            </p>
            <p className="text-[10px] mt-1.5 font-semibold" style={{ color: '#4285F4' }}>
              {state.destinationUrl || 'https://yourwebsite.com'}
            </p>
          </div>
        </div>
      )
    }

    if (activeTab === 'display') {
      return (
        <div className="mx-auto" style={{ maxWidth: 280 }}>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}` }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{ height: 140, background: isDark ? '#1a1a2e' : '#e8f0fe' }}
            >
              {hasMedia && isBanner ? (
                <img src={state.mediaPreviewUrl!} alt="" className="w-full h-full object-cover" />
              ) : (
                <Monitor size={36} style={{ color: isDark ? '#4285F470' : '#4285F450' }} />
              )}
              <span
                className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: '#e8f0fe', color: '#4285F4' }}
              >Ad</span>
            </div>
            <div className="p-3" style={{ background: isDark ? '#2B2B2D' : '#fff' }}>
              <p className="text-xs font-bold mb-1" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{campaignName}</p>
              <button className="w-full py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#4285F4', color: '#fff' }}>
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'map' && state.platform === 'geofencing') {
      return (
        <div className="space-y-2">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ height: 220, background: isDark ? '#1A2340' : '#E8F0FE' }}
          >
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: `linear-gradient(#4285F430 1px, transparent 1px), linear-gradient(90deg, #4285F430 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-full h-px opacity-20" style={{ background: '#4285F4' }} />
              <div className="absolute w-px h-full opacity-20" style={{ background: '#4285F4' }} />
            </div>
            {state.geofences.slice(0, 3).map((zone, i) => {
              const positions = [
                { top: '40%', left: '50%' },
                { top: '25%', left: '30%' },
                { top: '60%', left: '70%' },
              ]
              return (
                <div
                  key={zone.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={positions[i]}
                >
                  <div
                    className="rounded-full border-2 flex items-center justify-center"
                    style={{
                      width: 56 - i * 8, height: 56 - i * 8,
                      borderColor: '#F5C518',
                      background: 'rgba(245,197,24,0.15)',
                    }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F5C518', boxShadow: '0 0 6px rgba(245,197,24,0.80)' }} />
                  </div>
                </div>
              )
            })}
            {state.geofences.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Add geofence zones to see them here</p>
              </div>
            )}
          </div>
          {state.geofences.length > 0 && (
            <div className="space-y-1.5">
              {state.geofences.map((z, i) => (
                <div key={z.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isDark ? 'rgba(30,30,31,0.60)' : '#F5F5F5' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: '#F5C518' }} />
                  <span className="text-xs font-semibold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{z.name || `Zone ${i + 1}`}</span>
                  <span className="ml-auto text-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{z.radius}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Default feed preview
    return (
      <div
        className="rounded-2xl overflow-hidden mx-auto max-w-xs"
        style={{ border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}` }}
      >
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: isDark ? '#2B2B2D' : '#fff', borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          <div className="w-7 h-7 rounded-full" style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)' }} />
          <div>
            <p className="text-[11px] font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{state.campaignName || 'YourBrand'}</p>
            <p className="text-[9px]" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Sponsored</p>
          </div>
        </div>
        <div
          className="relative flex items-center justify-center"
          style={{ height: 180, background: isDark ? '#1E1E1F' : '#F5F5F5' }}
        >
          {hasMedia && isBanner ? (
            <img src={state.mediaPreviewUrl!} alt="" className="w-full h-full object-cover" />
          ) : hasMedia && !isBanner ? (
            <video src={state.mediaPreviewUrl!} autoPlay loop muted className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-40">
              {isBanner ? <ImageIcon size={28} style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }} /> : <Video size={28} style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }} />}
              <span className="text-[11px]" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>Upload creative to preview</span>
            </div>
          )}
        </div>
        <div className="p-3 space-y-2" style={{ background: isDark ? '#2B2B2D' : '#fff' }}>
          <p className="text-xs" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
            {state.description || 'Your ad description will appear here. Make it compelling!'}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
              {state.destinationUrl || 'yourwebsite.com'}
            </span>
            <button
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#1A1A1A]"
              style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)' }}
            >
              {state.ctaText || 'Learn More'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const activePlatform = PLATFORMS.find(p => p.id === state.platform)

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4 space-y-4"
        style={{
          background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
          border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
          backdropFilter: 'blur(20px)',
          boxShadow: isDark
            ? '0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(52,52,56,0.80)'
            : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#7DBB91', boxShadow: '0 0 8px rgba(125,187,145,0.60)' }} />
            <span className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
              Live Preview
            </span>
          </div>
          {activePlatform && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${activePlatform.color}20`, color: activePlatform.color }}
            >
              {activePlatform.name}
            </span>
          )}
        </div>

        {tabs.length > 1 && (
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(245,245,245,0.80)' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={activeTab === t.id ? {
                  background: isDark ? '#2B2B2D' : '#fff',
                  color: isDark ? '#F5F5F5' : '#1A1A1A',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                } : { color: isDark ? '#71717A' : '#9CA3AF' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <PreviewFrame />
      </div>
    </div>
  )
}

// ─── Campaign Summary ─────────────────────────────────────────────────────────

function CampaignSummary({ state, onLaunch, isDark, saving, saveError }: {
  state: CampaignState
  onLaunch: () => void
  isDark: boolean
  saving?: boolean
  saveError?: string
}) {
  const impressions = state.impressions
  const totalUSD = impressionsToUSD(impressions)
  const estimatedReach = Math.round(impressions * 0.72)
  const platform = PLATFORMS.find(p => p.id === state.platform)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 space-y-4"
      style={{
        background: isDark ? 'rgba(43,43,45,0.95)' : 'rgba(255,255,255,0.95)',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        backdropFilter: 'blur(40px)',
        boxShadow: isDark
          ? '0 -4px 32px rgba(0,0,0,0.40), 0 0 0 1px rgba(52,52,56,0.80)'
          : '0 -4px 24px rgba(0,0,0,0.08)',
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Platform', value: platform?.name ?? '—' },
          { label: 'Campaign', value: state.campaignName || '—', truncate: true },
          { label: 'Audience', value: state.selectedAudience?.name ?? '—', truncate: true },
          { label: 'Impressions', value: impressions.toLocaleString() },
          { label: 'Est. Reach', value: estimatedReach.toLocaleString() },
          { label: 'Total Cost', value: formatUSD(totalUSD) },
        ].map(({ label, value, truncate }) => (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{label}</p>
            <p className={`text-sm font-bold ${truncate ? 'truncate' : ''}`} style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{value}</p>
          </div>
        ))}
      </div>

      {saveError && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.30)', color: '#FF6B6B' }}>
          <AlertCircle size={13} /> {saveError}
        </div>
      )}

      <motion.button
        whileHover={saving ? {} : { scale: 1.01, y: -1 }}
        whileTap={saving ? {} : { scale: 0.98 }}
        onClick={onLaunch}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl text-base font-bold flex items-center justify-center gap-2.5 disabled:opacity-70"
        style={{
          background: 'linear-gradient(135deg, #F5C518 0%, #FFD84D 50%, #FFB800 100%)',
          color: '#1A1A1A',
          boxShadow: '0 8px 32px rgba(245,197,24,0.40), 0 2px 8px rgba(245,197,24,0.25)',
          fontFamily: 'var(--font-poppins), sans-serif',
        }}
      >
        {saving
          ? <><Loader2 size={18} className="animate-spin" strokeWidth={2.2} /> Saving Campaign…</>
          : <><Rocket size={18} strokeWidth={2.2} /> Pay &amp; Launch Campaign</>
        }
      </motion.button>
    </motion.div>
  )
}

// ─── Launch Confirmation Modal ────────────────────────────────────────────────

function LaunchModal({ state, onConfirm, onClose, isDark, campaignId }: {
  state: CampaignState
  onConfirm: (id: string) => void
  onClose: () => void
  isDark: boolean
  campaignId: string | null
}) {
  const impressions = state.impressions
  const totalUSD = impressionsToUSD(impressions)
  const totalINR = impressionsToINR(impressions)
  const platform = PLATFORMS.find(p => p.id === state.platform)
  const [launched, setLaunched] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!campaignId) { setError('Campaign not saved. Please try again.'); return }
    setPaying(true)
    setError('')

    try {
      // Load Razorpay script
      const loaded = await loadRazorpayScript()
      if (!loaded) { setError('Could not load payment gateway. Check your internet connection.'); setPaying(false); return }

      // Create Razorpay order
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })
      const orderData = await orderRes.json() as { orderId?: string; amount?: number; currency?: string; paymentId?: string; keyId?: string; campaignName?: string; error?: string }
      if (!orderRes.ok) { setError(orderData.error ?? 'Failed to create payment order'); setPaying(false); return }

      const { orderId, amount, paymentId, keyId, campaignName } = orderData as Required<typeof orderData>

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key:          keyId,
        amount,
        currency:     'INR',
        name:         'CookReels',
        description:  `Campaign: ${campaignName}`,
        order_id:     orderId,
        theme:        { color: '#F5C518' },
        modal:        { ondismiss: () => setPaying(false) },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                paymentId,
              }),
            })
            const verifyData = await verifyRes.json() as { success?: boolean; campaignId?: string; error?: string }
            if (!verifyRes.ok) { setError(verifyData.error ?? 'Payment verification failed'); setPaying(false); return }
            setLaunched(true)
            setPaying(false)
            setTimeout(() => onConfirm(verifyData.campaignId ?? campaignId), 1800)
          } catch {
            setError('Payment verification failed. Contact support.')
            setPaying(false)
          }
        },
      })
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.')
        setPaying(false)
      })
      rzp.open()
    } catch {
      setError('Something went wrong. Please try again.')
      setPaying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="w-full max-w-md rounded-3xl p-6 space-y-5"
        style={{
          background: isDark ? '#2B2B2D' : '#fff',
          border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.40)',
        }}
      >
        {!launched ? (
          <>
            <div className="text-center space-y-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.30)' }}
              >
                <Rocket size={24} style={{ color: '#F5C518' }} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
                Launch Campaign?
              </h3>
              <p className="text-sm" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
                Review your campaign details before going live.
              </p>
            </div>

            <div className="space-y-2 rounded-2xl p-4" style={{ background: isDark ? 'rgba(30,30,31,0.60)' : '#F9FAFB', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}` }}>
              {[
                ['Platform', platform?.name ?? '—'],
                ['Campaign', state.campaignName || '—'],
                ['Objective', state.objective || '—'],
                ['Impressions', impressions.toLocaleString()],
                ['Total Cost', `${formatUSD(totalUSD)} (≈ ₹${totalINR.toLocaleString('en-IN')})`],
                ['Schedule', state.startDate && state.endDate ? `${state.startDate} → ${state.endDate}` : 'Not set'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{k}</span>
                  <span className="font-semibold text-right max-w-[60%] truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{v}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.30)', color: '#FF6B6B' }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={paying}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: isDark ? 'rgba(52,52,56,0.80)' : '#F5F5F5', color: isDark ? '#A1A1AA' : '#666' }}
              >
                Go Back
              </button>
              <motion.button
                whileHover={paying ? {} : { scale: 1.02 }}
                whileTap={paying ? {} : { scale: 0.97 }}
                onClick={handleConfirm}
                disabled={paying}
                className="flex-[2] py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #F5C518, #FFB800)',
                  color: '#1A1A1A',
                  boxShadow: '0 4px 16px rgba(245,197,24,0.40)',
                }}
              >
                {paying ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><Rocket size={16} /> Pay & Launch</>}
              </motion.button>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
            className="text-center py-4 space-y-4"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: 1 }}
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(125,187,145,0.20)', border: '2px solid #7DBB91' }}
            >
              <CheckCircle2 size={32} style={{ color: '#7DBB91' }} />
            </motion.div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
                Campaign Created Successfully!
              </h3>
              <p className="text-sm" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
                Your payment has been received.
              </p>
            </div>
            <div
              className="rounded-2xl px-4 py-3.5 text-left space-y-2"
              style={{ background: isDark ? 'rgba(245,197,24,0.08)' : 'rgba(245,197,24,0.07)', border: '1px solid rgba(245,197,24,0.28)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,197,24,0.20)' }}>
                  <AlertCircle size={13} style={{ color: '#F5C518' }} />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#F5C518' }}>Under Review</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: isDark ? '#D4D4D8' : '#3F3F46' }}>
                Your campaign has been submitted for review. It typically takes up to <span className="font-semibold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>24 hours</span> to complete the review process and begin delivering results.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Main BoostPage ───────────────────────────────────────────────────────────

const INITIAL_STATE: CampaignState = {
  platform: '',
  campaignName: '',
  objective: '',
  description: '',
  adFormat: 'banner',
  mediaFile: null,
  mediaPreviewUrl: null,
  mediaInfo: null,
  geofences: [],
  startDate: '',
  endDate: '',
  timezone: 'Asia/Kolkata',
  ctaText: 'Learn More',
  destinationUrl: '',
  selectedAudience: null,
  adHeading: '',
  impressions: 0,
}

export function BoostPage({ username }: { username: string }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()
  const [campaign, setCampaign] = useState<CampaignState>(INITIAL_STATE)
  const [showModal, setShowModal] = useState(false)
  const [mobileStep, setMobileStep] = useState<MobileStep>(1)
  const [savingDraft, setSavingDraft] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const update = useCallback((key: keyof CampaignState, value: unknown) => {
    setCampaign(prev => ({ ...prev, [key]: value }))
  }, [])

  const formErrors: Record<string, string> = {
    ...(!campaign.campaignName.trim() && { campaignName: 'Campaign Name is required.' }),
    ...(!campaign.objective && { objective: 'Please select a Campaign Objective.' }),
    ...(!campaign.selectedAudience && { audiences: 'Please select an audience.' }),
    ...(!campaign.adHeading.trim() && { adHeading: 'Ad Heading is required.' }),
    ...(!campaign.description.trim() && { adDescription: 'Ad Description is required.' }),
    ...(!campaign.mediaFile && { mediaFile: 'Please upload an Ad Banner or Reel.' }),
    ...(!(campaign.impressions > 0) && { budget: 'Please enter the number of impressions you want to buy.' }),
    ...((!campaign.startDate || !campaign.endDate || new Date(campaign.endDate) <= new Date(campaign.startDate)) && { endDate: 'End Date must be after Start Date.' }),
  }

  const handleLaunch = async () => {
    setSubmitAttempted(true)
    if (Object.keys(formErrors).length > 0) { setSaveError('Please fix the highlighted errors before launching.'); return }

    setSavingDraft(true)
    setSaveError('')

    const impressions = campaign.impressions
    const totalINR = impressionsToINR(impressions)
    const days = campaign.startDate && campaign.endDate
      ? Math.max(1, Math.round((new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / 86_400_000))
      : 7

    try {
      // Upload the selected banner/reel to storage before creating the campaign —
      // without this, bannerUrl/adVideoUrl never reach the database and the
      // detail view has nothing to show.
      let bannerUrl: string | undefined
      let adVideoUrl: string | undefined
      if (campaign.mediaFile) {
        const isBanner = campaign.adFormat === 'banner'
        const prefix = isBanner ? 'banner' : 'reel'
        try {
          const url = await uploadToS3(campaign.mediaFile, isBanner ? 'campaigns/banner' : 'campaigns/video', `${prefix}_${Date.now()}_${campaign.mediaFile.name}`)
          if (isBanner) bannerUrl = url
          else adVideoUrl = url
        } catch {
          setSaveError('Failed to upload ad creative. Please try again.')
          setSavingDraft(false)
          return
        }
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         campaign.campaignName,
          objective:    campaign.objective || 'BRAND_AWARENESS',
          bannerUrl,
          adVideoUrl,
          audienceData: {
            platform:       campaign.platform || 'cookreels',
            adFormat:       campaign.adFormat,
            description:    campaign.description,
            geofences:      campaign.geofences,
            adHeading:      campaign.adHeading,
            ctaText:        campaign.ctaText,
            destinationUrl: campaign.destinationUrl,
            bannerUrl,
            adVideoUrl,
          },
          audienceId:   campaign.selectedAudience!.id,
          durationDays: days,
          dailyBudget:  totalINR / days,
          totalBudget:  totalINR,
          impressions,
          startDate:    campaign.startDate || null,
          endDate:      campaign.endDate   || null,
        }),
      })

      const data = await res.json() as { id?: string; error?: string }
      if (!res.ok) { setSaveError(data.error ?? 'Failed to save campaign'); setSavingDraft(false); return }

      setCampaignId(data.id ?? null)
      setShowModal(true)
    } catch {
      setSaveError('Network error. Please try again.')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleConfirmed = (activatedId: string) => {
    setTimeout(() => {
      setShowModal(false)
      setCampaign(INITIAL_STATE)
      setCampaignId(null)
      setMobileStep(1)
      setSubmitAttempted(false)
      router.push('/boost')
    }, 2200)
  }

  const visibleErrors = submitAttempted ? formErrors : {}
  const sectionProps = { state: campaign, update, isDark, errors: visibleErrors }
  const isGeofencing = campaign.platform === 'geofencing'

  const mobileSections: Record<MobileStep, React.ReactNode> = {
    1: <CampaignTypeSelector value={campaign.platform} onChange={p => update('platform', p)} isDark={isDark} />,
    2: <div className="space-y-4"><CampaignDetailsCard {...sectionProps} /><ObjectiveCard {...sectionProps} /></div>,
    3: (
      <div className="space-y-4">
        <AudienceStep
          selected={campaign.selectedAudience}
          onChange={next => update('selectedAudience', next)}
          isDark={isDark}
          errorMessage={visibleErrors.audiences}
        />
        {isGeofencing && <GeofencingBuilder state={campaign} update={update} isDark={isDark} />}
      </div>
    ),
    4: <AdSetCard {...sectionProps} />,
    5: <AdPreviewPanel state={campaign} isDark={isDark} />,
    6: <CampaignSummary state={campaign} onLaunch={handleLaunch} isDark={isDark} saving={savingDraft} saveError={saveError} />,
  }

  return (
    <>
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-5 animate-blob"
          style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }} />
        <div className="absolute top-1/2 -left-20 w-64 h-64 rounded-full opacity-4 animate-blob-alt"
          style={{ background: 'radial-gradient(circle, #FF9F1C, transparent)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 px-1"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => router.push('/boost')}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                background: isDark ? 'rgba(43,43,45,0.80)' : 'rgba(255,255,255,0.90)',
                border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                color: isDark ? '#A1A1AA' : '#666666',
              }}
              aria-label="Back to Boost Center"
            >
              <ArrowLeft size={16} strokeWidth={2} />
            </motion.button>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', boxShadow: '0 8px 24px rgba(245,197,24,0.35)' }}
            >
              <Megaphone size={18} className="text-[#1A1A1A]" strokeWidth={2.2} />
            </div>
            <div>
              <h1
                className="text-2xl font-bold text-gradient-yellow"
                style={{ fontFamily: 'var(--font-poppins), sans-serif' }}
              >
                Boost Your Product
              </h1>
              <p className="text-sm" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
                Promote your business across multiple advertising networks.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Mobile step navigator */}
        <div className="lg:hidden mb-5 overflow-x-auto scrollbar-none">
          <div className="flex gap-1 pb-1 min-w-max px-1">
            {MOBILE_STEPS.map(({ step, label }) => (
              <button
                key={step}
                onClick={() => setMobileStep(step)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                style={mobileStep === step ? {
                  background: 'linear-gradient(135deg, #F5C518, #FFB800)',
                  color: '#1A1A1A',
                  boxShadow: '0 4px 12px rgba(245,197,24,0.35)',
                } : {
                  background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.80)',
                  border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                  color: isDark ? '#A1A1AA' : '#666',
                }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={mobileStep === step ? { background: 'rgba(0,0,0,0.15)' } : { background: isDark ? '#343438' : '#E8E8E8' }}
                >
                  {step}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: step content */}
        <div className="lg:hidden space-y-4 pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {mobileSections[mobileStep]}
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-3">
            {mobileStep > 1 && (
              <button
                onClick={() => setMobileStep(s => (s - 1) as MobileStep)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
                style={{ background: isDark ? 'rgba(52,52,56,0.80)' : '#F5F5F5', color: isDark ? '#A1A1AA' : '#666', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}` }}
              >
                ← Back
              </button>
            )}
            {mobileStep < 6 && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMobileStep(s => (s + 1) as MobileStep)}
                className="flex-[2] py-3 rounded-2xl text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 4px 16px rgba(245,197,24,0.35)' }}
              >
                Continue →
              </motion.button>
            )}
          </div>
        </div>

        {/* Desktop: 2-column layout */}
        <div className="hidden lg:flex gap-6 pb-6">
          {/* Left: form (70%) */}
          <div className="flex-1 min-w-0 space-y-4">
            <CampaignTypeSelector value={campaign.platform} onChange={p => update('platform', p)} isDark={isDark} />
            <CampaignDetailsCard {...sectionProps} />
            <ObjectiveCard {...sectionProps} />
            <AudienceStep
              selected={campaign.selectedAudience}
              onChange={next => update('selectedAudience', next)}
              isDark={isDark}
              errorMessage={visibleErrors.audiences}
            />
            {isGeofencing && <GeofencingBuilder state={campaign} update={update} isDark={isDark} />}
            <AdSetCard {...sectionProps} />
            <CampaignSummary
              state={campaign}
              onLaunch={handleLaunch}
              isDark={isDark}
              saving={savingDraft}
              saveError={saveError}
            />
          </div>

          {/* Right: preview (30%) */}
          <div className="w-80 xl:w-96 shrink-0">
            <div className="sticky top-6">
              <AdPreviewPanel state={campaign} isDark={isDark} />
            </div>
          </div>
        </div>
      </div>

      {/* Launch modal */}
      <AnimatePresence>
        {showModal && (
          <LaunchModal
            state={campaign}
            onConfirm={handleConfirmed}
            onClose={() => setShowModal(false)}
            isDark={isDark}
            campaignId={campaignId}
          />
        )}
      </AnimatePresence>
    </>
  )
}
