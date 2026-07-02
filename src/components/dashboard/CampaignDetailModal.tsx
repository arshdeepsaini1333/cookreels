'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import type { CampaignDetail } from '@/types/campaign'
import {
  X, Edit2, Save, Loader2, CheckCircle2, Clock, FileText, Pause,
  XCircle, DollarSign, Users, ExternalLink, Image as ImageIcon, Video,
  Megaphone, BarChart2, CreditCard, Target, Trash2, Plus,
  MapPin, Upload,
} from 'lucide-react'
import { uploadToS3 } from '@/lib/uploadTos3'
import { ProtectedImg, ProtectedVideo } from '@/components/shared/ProtectedMedia'

// ─── Static data matching creation flow ───────────────────────────────────────

const CTA_OPTIONS = ['Learn More', 'Shop Now', 'Order Now', 'Visit Website', 'Download App', 'Book Now', 'Get Offer', 'Subscribe']
const LANGUAGES   = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Arabic', 'Japanese', 'Korean']
const INTERESTS   = ['Cooking', 'Recipes', 'Fitness', 'Food Lovers', 'Restaurants', 'Travel', 'Technology', 'Fashion', 'Health & Wellness', 'Photography', 'Home Decor', 'Baking', 'Street Food', 'Vegan', 'Nutrition']
const COUNTRIES   = ['India', 'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Singapore', 'UAE', 'Brazil', 'Japan', 'South Korea', 'Indonesia', 'Mexico']
const TIMEZONES   = ['Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Australia/Sydney', 'Asia/Singapore']
const RADIUS_OPTS = ['100m', '250m', '500m', '1km', '5km', '10km']

const AUD_GENDER_LABEL: Record<string, string> = { all: 'All Genders', male: 'Male', female: 'Female' }
const AUD_DEVICE_LABEL: Record<string, string> = { all: 'All Devices', mobile: 'Mobile', desktop: 'Desktop', tablet: 'Tablet' }
const AUD_OS_LABEL: Record<string, string> = { all: 'All OS', android: 'Android', ios: 'iOS', windows: 'Windows', macos: 'macOS', linux: 'Linux' }
const AUD_LOCATION_TYPE_LABEL: Record<string, string> = { country: 'Country', state: 'State', city: 'City', district: 'District', pincode: 'Pincode' }

// ─── Status config (Prisma enum — uppercase) ──────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  DRAFT:           { label: 'Draft',          color: '#A1A1AA', bg: 'rgba(161,161,170,0.15)', Icon: FileText },
  PENDING_PAYMENT: { label: 'Pending Review', color: '#F5C518', bg: 'rgba(245,197,24,0.15)',  Icon: Clock },
  ACTIVE:          { label: 'Live',           color: '#7DBB91', bg: 'rgba(125,187,145,0.15)', Icon: CheckCircle2 },
  PAUSED:          { label: 'Paused',         color: '#FF9F1C', bg: 'rgba(255,159,28,0.15)',  Icon: Pause },
  COMPLETED:       { label: 'Completed',      color: '#4285F4', bg: 'rgba(66,133,244,0.15)',  Icon: CheckCircle2 },
  CANCELLED:       { label: 'Cancelled',      color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', Icon: XCircle },
  REJECTED:        { label: 'Rejected',       color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', Icon: XCircle },
}

const OBJECTIVE_LABELS: Record<string, string> = {
  LEADS: 'Leads', WEBSITE_TRAFFIC: 'Website Traffic', APP_INSTALLS: 'App Installs',
  VIDEO_VIEWS: 'Video Views', PROFILE_VISITS: 'Profile Visits', BRAND_AWARENESS: 'Brand Awareness',
  ENGAGEMENT: 'Engagement', REACH: 'Reach', CONVERSIONS: 'Conversions',
}
const PLATFORM_COLORS: Record<string, string> = {
  cookreels: '#F5C518', meta: '#E1306C', google: '#4285F4', geofencing: '#7DBB91',
}
const PLATFORM_LABELS: Record<string, string> = {
  cookreels: 'CookReels', meta: 'Meta', google: 'Google', geofencing: 'Geofencing',
}

function fmtINR(n: number) {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n.toFixed(0)}`
}
function fmtNum(n: number) {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ─── Geofence type ────────────────────────────────────────────────────────────

interface GeofenceZone { id: string; name: string; lat: string; lng: string; radius: string }

// ─── Edit form ────────────────────────────────────────────────────────────────

interface EditForm {
  name:           string
  description:    string
  objective:      string
  adFormat:       'banner' | 'reel'
  ctaText:        string
  destinationUrl: string
  bannerUrl:      string
  adVideoUrl:     string
  // targeting
  locations:      string[]
  state:          string
  city:           string
  ageMin:         number
  ageMax:         number
  gender:         string
  languages:      string[]
  interests:      string[]
  geofences:      GeofenceZone[]
  // budget & schedule
  impressions:    number
  budgetType:     'daily' | 'lifetime'
  dailyBudget:    number
  totalBudget:    number
  durationDays:   number
  startDate:      string
  endDate:        string
  timezone:       string
}

function initForm(d: CampaignDetail): EditForm {
  const ad = (d.audienceData ?? {}) as Record<string, unknown>
  return {
    name:           d.name,
    description:    (ad.description as string) ?? '',
    objective:      d.objective,
    adFormat:       ((ad.adFormat as string) ?? 'reel') as 'banner' | 'reel',
    ctaText:        (ad.ctaText as string) ?? '',
    destinationUrl: (ad.destinationUrl as string) ?? '',
    bannerUrl:      d.bannerUrl  ?? (ad.bannerUrl as string)  ?? '',
    adVideoUrl:     d.adVideoUrl ?? (ad.adVideoUrl as string) ?? '',
    locations:      (d.locations as string[]) ?? [],
    state:          (ad.state as string) ?? '',
    city:           (ad.city as string) ?? '',
    ageMin:         d.ageMin ?? 18,
    ageMax:         d.ageMax ?? 65,
    gender:         d.gender ?? 'all',
    languages:      (ad.languages as string[]) ?? [],
    interests:      (ad.interests as string[]) ?? [],
    geofences:      (ad.geofences as GeofenceZone[]) ?? [],
    impressions:    d.impressions || (ad.impressions as number) || 10000,
    budgetType:     ((ad.budgetType as string) ?? 'daily') as 'daily' | 'lifetime',
    dailyBudget:    d.dailyBudget,
    totalBudget:    d.totalBudget,
    durationDays:   d.durationDays,
    startDate:      d.startDate ? d.startDate.slice(0, 10) : '',
    endDate:        d.endDate   ? d.endDate.slice(0, 10)   : '',
    timezone:       (ad.timezone as string) ?? 'Asia/Kolkata',
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  campaignId:       string | null
  startInEditMode?: boolean
  onClose:          () => void
  onRefresh:        () => void
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CampaignDetailModal({ campaignId, startInEditMode, onClose, onRefresh }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])

  const [detail,  setDetail]  = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState<EditForm | null>(null)
  const [error,   setError]   = useState('')

  // search states for edit-mode chip inputs
  const [langQ,     setLangQ]     = useState('')
  const [interestQ, setInterestQ] = useState('')
  const [countryQ,  setCountryQ]  = useState('')

  // media upload states
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingVideo,  setUploadingVideo]  = useState(false)
  const [mediaError,      setMediaError]      = useState('')
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!campaignId) { setDetail(null); return }
    setLoading(true); setEditing(false); setError('')
    fetch(`/api/campaigns/${campaignId}`)
      .then(r => r.json())
      .then((d: CampaignDetail) => {
        setDetail(d); setLoading(false)
        if (startInEditMode && ['DRAFT', 'PAUSED'].includes(d.status)) {
          setForm(initForm(d)); setEditing(true)
        }
      })
      .catch(() => setLoading(false))
  }, [campaignId, startInEditMode])

  const canEdit = detail && ['DRAFT', 'PAUSED'].includes(detail.status)

  const startEditing = () => {
    if (!detail) return
    setForm(initForm(detail)); setEditing(true)
    setLangQ(''); setInterestQ(''); setCountryQ('')
  }

  const handleSave = async () => {
    if (!detail || !form) return
    setSaving(true); setError('')
    const body = {
      name:         form.name,
      objective:    form.objective,
      locations:    form.locations,
      ageMin:       form.ageMin,
      ageMax:       form.ageMax,
      gender:       form.gender,
      durationDays: form.durationDays,
      dailyBudget:  form.dailyBudget,
      totalBudget:  form.totalBudget,
      impressions:  form.impressions,
      startDate:    form.startDate || null,
      endDate:      form.endDate   || null,
      bannerUrl:    form.bannerUrl  || null,
      adVideoUrl:   form.adVideoUrl || null,
      audienceData: {
        ...detail.audienceData,
        description:    form.description,
        adFormat:       form.adFormat,
        ctaText:        form.ctaText,
        destinationUrl: form.destinationUrl,
        bannerUrl:      form.bannerUrl  || undefined,
        adVideoUrl:     form.adVideoUrl || undefined,
        state:          form.state,
        city:           form.city,
        languages:      form.languages,
        interests:      form.interests,
        geofences:      form.geofences,
        budgetType:     form.budgetType,
        timezone:       form.timezone,
      },
    }
    const res = await fetch(`/api/campaigns/${detail.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (!res.ok) {
      const d = await res.json(); setError(d.error ?? 'Failed to save'); setSaving(false); return
    }
    const updated: CampaignDetail = await fetch(`/api/campaigns/${detail.id}`).then(r => r.json())
    setDetail(updated); setEditing(false); setSaving(false); onRefresh()
  }

  const upd = <K extends keyof EditForm>(key: K, val: EditForm[K]) =>
    setForm(f => f ? { ...f, [key]: val } : f)

  const toggleArr = (key: 'languages' | 'interests' | 'locations', val: string) =>
    setForm(f => {
      if (!f) return f
      const arr = f[key] as string[]
      return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
    })

  const addGeoZone = () =>
    setForm(f => f ? { ...f, geofences: [...f.geofences, { id: Math.random().toString(36).slice(2), name: '', lat: '28.6139', lng: '77.2090', radius: '1km' }] } : f)

  const updGeo = (id: string, field: keyof GeofenceZone, val: string) =>
    setForm(f => f ? { ...f, geofences: f.geofences.map(z => z.id === id ? { ...z, [field]: val } : z) } : f)

  const rmGeo = (id: string) =>
    setForm(f => f ? { ...f, geofences: f.geofences.filter(z => z.id !== id) } : f)

  const handleBannerUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setMediaError('Please select an image file (JPG, PNG, WebP).'); return }
    if (file.size > 10 * 1024 * 1024)   { setMediaError('Image must be under 10 MB.'); return }
    setMediaError(''); setUploadingBanner(true)
    try {
      const url = await uploadToS3(file, 'campaigns/banner', `banner_${Date.now()}_${file.name}`)
      upd('bannerUrl', url)
    } catch { setMediaError('Banner upload failed. Please try again.') }
    finally  { setUploadingBanner(false) }
  }

  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) { setMediaError('Please select a video file (MP4, MOV, WebM).'); return }
    if (file.size > 500 * 1024 * 1024)  { setMediaError('Video must be under 500 MB.'); return }
    setMediaError(''); setUploadingVideo(true)
    try {
      const url = await uploadToS3(file, 'campaigns/video', `reel_${Date.now()}_${file.name}`)
      upd('adVideoUrl', url)
    } catch { setMediaError('Video upload failed. Please try again.') }
    finally  { setUploadingVideo(false) }
  }

  // ─── Design tokens ──────────────────────────────────────────────────────────
  const bg          = isDark ? '#1A1A1B' : '#FFFFFF'
  const border      = isDark ? '#343438' : '#E8E8E8'
  const textPrimary = isDark ? '#F5F5F5' : '#1A1A1A'
  const textMuted   = isDark ? '#71717A' : '#9CA3AF'
  const sectionBg   = isDark ? 'rgba(30,30,31,0.70)' : 'rgba(248,248,248,0.90)'
  const inputBg     = isDark ? 'rgba(30,30,31,0.90)' : '#F9FAFB'
  const chipBg      = isDark ? 'rgba(52,52,56,0.70)' : '#F0F0F0'

  if (!campaignId || !mounted) return null

  const ad        = (detail?.audienceData ?? {}) as Record<string, unknown>
  const cfg       = detail ? (STATUS_CFG[detail.status] ?? STATUS_CFG.DRAFT) : null
  const StatusIcon = cfg?.Icon ?? FileText
  const pKey      = (ad.platform as string) ?? 'cookreels'
  const pColor    = PLATFORM_COLORS[pKey] ?? '#F5C518'
  const pLabel    = PLATFORM_LABELS[pKey] ?? pKey
  const isGeo     = pKey === 'geofencing'

  const inp = (label: string, value: string, onChange: (v: string) => void, opts?: { type?: string; placeholder?: string; rows?: number }) => (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {opts?.rows ? (
        <textarea rows={opts.rows} value={value} onChange={e => onChange(e.target.value)} placeholder={opts.placeholder}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary, outline: 'none', boxSizing: 'border-box', resize: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(245,197,24,0.65)')}
          onBlur={e => (e.currentTarget.style.borderColor = border)} />
      ) : (
        <input type={opts?.type ?? 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={opts?.placeholder}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(245,197,24,0.65)')}
          onBlur={e => (e.currentTarget.style.borderColor = border)} />
      )}
    </div>
  )

  return createPortal(
    <AnimatePresence>
      {/* Backdrop — rendered into document.body so it covers sidebar/nav */}
      <motion.div key="bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)', zIndex: 99998 }}
        onClick={onClose}
      />

      {/* Centering container */}
      <div key="center" style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '3vh', paddingBottom: '3vh',
        pointerEvents: 'none',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          style={{
            pointerEvents: 'auto',
            width: 'min(720px, 96vw)',
            maxHeight: '94vh',
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: isDark
              ? '0 32px 90px rgba(0,0,0,0.65), 0 0 0 1px rgba(52,52,56,0.80)'
              : '0 32px 90px rgba(0,0,0,0.20)',
          }}
        >
          {/* ── Header ── */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Megaphone size={15} style={{ color: '#F5C518' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {loading || !detail ? (
                <div style={{ height: 16, width: 200, borderRadius: 6, background: isDark ? '#343438' : '#F0F0F0' }} />
              ) : (
                <>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: textPrimary, fontFamily: 'var(--font-poppins), sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {detail.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {cfg && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                        <StatusIcon size={9} strokeWidth={2.5} />{cfg.label}
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: `${pColor}18`, color: pColor, border: `1px solid ${pColor}30` }}>{pLabel}</span>
                    {(ad.adFormat as string | undefined) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: ad.adFormat === 'banner' ? 'rgba(66,133,244,0.12)' : 'rgba(245,197,24,0.12)', color: ad.adFormat === 'banner' ? '#4285F4' : '#F5C518' }}>
                        {ad.adFormat === 'banner' ? <ImageIcon size={9} /> : <Video size={9} />}
                        {ad.adFormat === 'banner' ? 'Banner' : 'Reel'}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {!editing && canEdit && !loading && (
                <button onClick={startEditing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, cursor: 'pointer', background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.35)', color: '#F5C518', fontSize: 12, fontWeight: 600 }}>
                  <Edit2 size={12} /> Edit
                </button>
              )}
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(52,52,56,0.60)' : 'rgba(0,0,0,0.06)', color: textMuted, border: 'none' }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Loading */}
            {loading && [80, 110, 90, 120, 80].map((h, i) => (
              <div key={i} style={{ height: h, borderRadius: 12, background: isDark ? 'rgba(52,52,56,0.40)' : 'rgba(0,0,0,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}

            {/* ── VIEW MODE ── mirrors edit sections exactly, read-only ── */}
            {!loading && detail && !editing && (() => {
              const bannerSrc = detail.bannerUrl  ?? (ad.bannerUrl  as string | undefined)
              const videoSrc  = detail.adVideoUrl ?? (ad.adVideoUrl as string | undefined)
              const isBanner  = ad.adFormat === 'banner'
              const accentClr = isBanner ? '#4285F4' : '#F5C518'
              const accentBg  = isBanner ? 'rgba(66,133,244,0.10)' : 'rgba(245,197,24,0.10)'
              const pill = (label: string, active: boolean, color: string, activeBg: string) => (
                <div key={label} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1.5px solid ${active ? color : border}`, background: active ? activeBg : inputBg, color: active ? color : textMuted, fontSize: 11, fontWeight: 700, textAlign: 'center' as const, userSelect: 'none' as const }}>
                  {label}
                </div>
              )
              return (
                <>
                  {/* 1. Campaign Name */}
                  <Box title="Campaign Name" icon={<Megaphone size={13} style={{ color: '#F5C518' }} />} bg={sectionBg} border={border}>
                    <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary }}>
                      {detail.name}
                    </div>
                  </Box>

                  {/* 2. Ad Creative */}
                  <Box title="Ad Creative" icon={<ImageIcon size={13} style={{ color: '#4285F4' }} />} bg={sectionBg} border={border}>
                    {/* Format pills (read-only) */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ad Format</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {pill('Reel / Video Ad', !isBanner, '#F5C518', 'rgba(245,197,24,0.10)')}
                        {pill('Banner Ad',       isBanner,  '#4285F4', 'rgba(66,133,244,0.10)')}
                      </div>
                    </div>

                    {/* Creative media preview */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {isBanner ? 'Banner Image' : 'Ad Video'}
                      </p>
                      <div style={{ borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${bannerSrc || videoSrc ? accentClr + '50' : border}`, background: '#000', minHeight: 100, position: 'relative' }}>
                        {bannerSrc && (
                          <ProtectedImg src={bannerSrc} alt="Banner" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }} />
                        )}
                        {!bannerSrc && videoSrc && (
                          <ProtectedVideo src={videoSrc} controls playsInline style={{ width: '100%', maxHeight: 280, display: 'block', background: '#000' }} />
                        )}
                        {!bannerSrc && !videoSrc && detail.reelThumbnail && (
                          <ProtectedImg src={detail.reelThumbnail} alt="Linked reel" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', display: 'block' }} />
                        )}
                        {!bannerSrc && !videoSrc && !detail.reelThumbnail && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '28px 16px' }}>
                            {isBanner ? <ImageIcon size={24} style={{ color: textMuted, opacity: 0.4 }} /> : <Video size={24} style={{ color: textMuted, opacity: 0.4 }} />}
                            <p style={{ margin: 0, fontSize: 11, color: textMuted }}>No {isBanner ? 'banner' : 'video'} uploaded yet</p>
                          </div>
                        )}
                        {(bannerSrc || videoSrc || detail.reelThumbnail) && (
                          <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(0,0,0,0.65)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {bannerSrc ? 'Uploaded Banner' : videoSrc ? 'Uploaded Video' : 'Linked Reel'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ad Heading */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ad Heading</p>
                      <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: inputBg, border: `1.5px solid ${border}`, color: ad.adHeading ? textPrimary : textMuted, fontStyle: ad.adHeading ? 'normal' : 'italic', opacity: ad.adHeading ? 1 : 0.6 }}>
                        {(ad.adHeading as string) || 'Not set'}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campaign Description</p>
                      <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, background: inputBg, border: `1.5px solid ${border}`, color: ad.description ? textPrimary : textMuted, minHeight: 60, lineHeight: 1.5 }}>
                        {(ad.description as string) || <em style={{ opacity: 0.5 }}>No description</em>}
                      </div>
                    </div>

                    {/* CTA presets (read-only chips) */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CTA Button Text</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {CTA_OPTIONS.map(c => (
                          <div key={c} style={{ padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1.5px solid ${ad.ctaText === c ? 'rgba(245,197,24,0.50)' : border}`, background: ad.ctaText === c ? 'rgba(245,197,24,0.12)' : inputBg, color: ad.ctaText === c ? '#F5C518' : textMuted }}>
                            {c}
                          </div>
                        ))}
                      </div>
                      {typeof ad.ctaText === 'string' && !CTA_OPTIONS.includes(ad.ctaText) && (
                        <div style={{ marginTop: 8, padding: '9px 12px', borderRadius: 10, fontSize: 13, background: 'rgba(245,197,24,0.08)', border: '1.5px solid rgba(245,197,24,0.30)', color: '#F5C518', fontWeight: 600 }}>
                          {ad.ctaText as string}
                        </div>
                      )}
                    </div>

                    {/* Destination URL */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Destination URL</p>
                      {ad.destinationUrl ? (
                        <a href={ad.destinationUrl as string} target="_blank" rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, fontSize: 13, background: inputBg, border: `1.5px solid ${border}`, color: '#4285F4', fontWeight: 500, wordBreak: 'break-all', textDecoration: 'none' }}>
                          <span style={{ flex: 1 }}>{ad.destinationUrl as string}</span>
                          <ExternalLink size={13} style={{ flexShrink: 0 }} />
                        </a>
                      ) : (
                        <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, background: inputBg, border: `1.5px solid ${border}`, color: textMuted, fontStyle: 'italic', opacity: 0.6 }}>Not set</div>
                      )}
                    </div>
                  </Box>

                  {/* 3. Campaign Objective */}
                  <Box title="Campaign Objective" icon={<Target size={13} style={{ color: '#7DBB91' }} />} bg={sectionBg} border={border}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {(['LEADS', 'WEBSITE_TRAFFIC', 'APP_INSTALLS', 'VIDEO_VIEWS', 'PROFILE_VISITS', 'BRAND_AWARENESS', 'ENGAGEMENT', 'REACH', 'CONVERSIONS'] as const).map(obj => (
                        <div key={obj} style={{ padding: '9px 0', borderRadius: 10, border: `1.5px solid ${detail.objective === obj ? '#7DBB91' : border}`, background: detail.objective === obj ? 'rgba(125,187,145,0.10)' : inputBg, color: detail.objective === obj ? '#7DBB91' : textMuted, fontSize: 11, fontWeight: 700, textAlign: 'center', userSelect: 'none' }}>
                          {OBJECTIVE_LABELS[obj]}
                        </div>
                      ))}
                    </div>
                  </Box>

                  {/* 4. Budget & Schedule */}
                  <Box title="Budget & Schedule" icon={<DollarSign size={13} style={{ color: '#FF9F1C' }} />} bg={sectionBg} border={border}>
                    {/* Budget amounts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <StatCard label="Daily Budget (₹)" value={fmtINR(detail.dailyBudget)} color="#FF9F1C" isDark={isDark} border={border} />
                      <StatCard label="Total Budget (₹)" value={fmtINR(detail.totalBudget)} color="#F5C518" isDark={isDark} border={border} />
                    </div>

                    {/* Target Impressions */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Impressions</p>
                      <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary }}>
                        {detail.impressions ? fmtNum(detail.impressions) : '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        {[10000, 50000, 100000, 500000].map(n => (
                          <div key={n} style={{ flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10, fontWeight: 700, textAlign: 'center', border: `1.5px solid ${detail.impressions === n ? 'rgba(245,197,24,0.45)' : border}`, background: detail.impressions === n ? 'rgba(245,197,24,0.10)' : inputBg, color: detail.impressions === n ? '#F5C518' : textMuted, userSelect: 'none' }}>
                            {n >= 100000 ? `${n / 100000}L` : `${n / 1000}K`}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Budget Type */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Budget Type</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {pill('Daily Budget',    (ad.budgetType as string) === 'daily',    '#FF9F1C', 'rgba(255,159,28,0.10)')}
                        {pill('Lifetime Budget', (ad.budgetType as string) === 'lifetime', '#FF9F1C', 'rgba(255,159,28,0.10)')}
                      </div>
                    </div>

                    {/* Duration + Timezone + Dates */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration (days)</p>
                        <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary }}>{detail.durationDays}</div>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Timezone</p>
                        <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(ad.timezone as string) || 'Asia/Kolkata'}</div>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Start Date</p>
                        <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: inputBg, border: `1.5px solid ${border}`, color: detail.startDate ? textPrimary : textMuted }}>{detail.startDate ? new Date(detail.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}</div>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>End Date</p>
                        <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: inputBg, border: `1.5px solid ${border}`, color: detail.endDate ? textPrimary : textMuted }}>{detail.endDate ? new Date(detail.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}</div>
                      </div>
                    </div>
                  </Box>

                  {/* 5. Audience Targeting */}
                  <Box title="Audience Targeting" icon={<Users size={13} style={{ color: '#E1306C' }} />} bg={sectionBg} border={border}>
                    {/* Linked reusable audience — full profile */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Selected Audience</p>
                      {detail.audience ? (
                        <div style={{ padding: 12, borderRadius: 12, background: inputBg, border: '1.5px solid rgba(225,48,108,0.30)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(225,48,108,0.12)', color: '#E1306C', border: '1px solid rgba(225,48,108,0.28)' }}>{detail.audience.name}</span>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                              <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gender</p>
                              <div style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: bg, border: `1px solid ${border}`, color: textPrimary }}>{AUD_GENDER_LABEL[detail.audience.gender] ?? detail.audience.gender}</div>
                            </div>
                            <div>
                              <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Age Range</p>
                              <div style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: bg, border: `1px solid ${border}`, color: textPrimary }}>{detail.audience.ageMin} – {detail.audience.ageMax >= 65 ? '65+' : detail.audience.ageMax}</div>
                            </div>
                            <div>
                              <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Device Type</p>
                              <div style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: bg, border: `1px solid ${border}`, color: textPrimary }}>{AUD_DEVICE_LABEL[detail.audience.deviceType] ?? detail.audience.deviceType}</div>
                            </div>
                            <div>
                              <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Operating System</p>
                              <div style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: bg, border: `1px solid ${border}`, color: textPrimary }}>{AUD_OS_LABEL[detail.audience.os] ?? detail.audience.os}</div>
                            </div>
                          </div>

                          <div>
                            <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Locations</p>
                            {detail.audience.locations.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {detail.audience.locations.map((l, i) => (
                                  <span key={`${l.type}-${l.value}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'rgba(245,197,24,0.10)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.22)' }}>
                                    <span style={{ opacity: 0.7 }}>{AUD_LOCATION_TYPE_LABEL[l.type] ?? l.type}:</span> {l.value}
                                  </span>
                                ))}
                              </div>
                            ) : <p style={{ margin: 0, fontSize: 11, color: textMuted, fontStyle: 'italic', opacity: 0.6 }}>No locations set</p>}
                          </div>

                          <div>
                            <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interests</p>
                            {detail.audience.interests.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {detail.audience.interests.map(i => (
                                  <span key={i} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'rgba(225,48,108,0.10)', color: '#E1306C', border: '1px solid rgba(225,48,108,0.22)' }}>{i}</span>
                                ))}
                              </div>
                            ) : <p style={{ margin: 0, fontSize: 11, color: textMuted, fontStyle: 'italic', opacity: 0.6 }}>No interests selected</p>}
                          </div>

                          <div>
                            <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Behaviours</p>
                            {detail.audience.behaviours.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {detail.audience.behaviours.map(b => (
                                  <span key={b} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'rgba(125,187,145,0.10)', color: '#7DBB91', border: '1px solid rgba(125,187,145,0.22)' }}>{b}</span>
                                ))}
                              </div>
                            ) : <p style={{ margin: 0, fontSize: 11, color: textMuted, fontStyle: 'italic', opacity: 0.6 }}>No behaviours selected</p>}
                          </div>
                        </div>
                      ) : <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 12, background: inputBg, border: `1.5px solid ${border}`, color: textMuted, fontStyle: 'italic', opacity: 0.6 }}>No reusable audience linked</div>}
                    </div>

                    {/* Countries */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Countries</p>
                      {(detail.locations as string[])?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {(detail.locations as string[]).map(l => (
                            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(245,197,24,0.12)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.28)' }}>{l}</span>
                          ))}
                        </div>
                      ) : <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 12, background: inputBg, border: `1.5px solid ${border}`, color: textMuted, fontStyle: 'italic', opacity: 0.6 }}>Not set</div>}
                    </div>

                    {/* State + City */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>State / Province</p>
                        <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, background: inputBg, border: `1.5px solid ${border}`, color: ad.state ? textPrimary : textMuted, fontStyle: ad.state ? 'normal' : 'italic', opacity: ad.state ? 1 : 0.6 }}>{(ad.state as string) || 'Not set'}</div>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>City</p>
                        <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, background: inputBg, border: `1.5px solid ${border}`, color: ad.city ? textPrimary : textMuted, fontStyle: ad.city ? 'normal' : 'italic', opacity: ad.city ? 1 : 0.6 }}>{(ad.city as string) || 'Not set'}</div>
                      </div>
                    </div>

                    {/* Age Range */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Age Range: {detail.ageMin ?? 18} – {(detail.ageMax ?? 65) === 65 ? '65+' : detail.ageMax}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 600, color: textMuted, marginBottom: 4 }}>Min Age</p>
                          <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary }}>{detail.ageMin ?? 18}</div>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 600, color: textMuted, marginBottom: 4 }}>Max Age</p>
                          <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary }}>{detail.ageMax ?? 65}</div>
                        </div>
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gender</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[{ v: 'all', l: 'All' }, { v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }].map(g => (
                          <div key={g.v} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: `1.5px solid ${detail.gender === g.v ? '#E1306C' : border}`, background: detail.gender === g.v ? 'rgba(225,48,108,0.10)' : inputBg, color: detail.gender === g.v ? '#E1306C' : textMuted, fontSize: 11, fontWeight: 700, textAlign: 'center', userSelect: 'none' }}>
                            {g.l}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Languages</p>
                      {(ad.languages as string[])?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {(ad.languages as string[]).map(l => (
                            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(245,197,24,0.12)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.28)' }}>{l}</span>
                          ))}
                        </div>
                      ) : <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 12, background: inputBg, border: `1.5px solid ${border}`, color: textMuted, fontStyle: 'italic', opacity: 0.6 }}>Not set</div>}
                    </div>

                    {/* Interest Tags */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interest Tags</p>
                      {(ad.interests as string[])?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {(ad.interests as string[]).map(i => (
                            <span key={i} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'rgba(245,197,24,0.10)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.22)' }}>{i}</span>
                          ))}
                        </div>
                      ) : <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 12, background: inputBg, border: `1.5px solid ${border}`, color: textMuted, fontStyle: 'italic', opacity: 0.6 }}>No interests selected</div>}
                    </div>
                  </Box>

                  {/* 6. Geofencing Zones */}
                  {isGeo && (
                    <Box title="Geofencing Zones" icon={<MapPin size={13} style={{ color: '#7DBB91' }} />} bg={sectionBg} border={border}>
                      {(ad.geofences as GeofenceZone[])?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {(ad.geofences as GeofenceZone[]).map((z, idx) => (
                            <div key={z.id} style={{ padding: '12px', borderRadius: 10, background: isDark ? 'rgba(30,30,31,0.80)' : '#F9FAFB', border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#7DBB91', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Zone {idx + 1}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(125,187,145,0.12)', color: '#7DBB91', border: '1px solid rgba(125,187,145,0.28)' }}>{z.radius}</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                <div>
                                  <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location Name</p>
                                  <div style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, background: inputBg, border: `1px solid ${border}`, color: z.name ? textPrimary : textMuted, fontStyle: z.name ? 'normal' : 'italic', opacity: z.name ? 1 : 0.6 }}>{z.name || 'Unnamed'}</div>
                                </div>
                                <div>
                                  <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Radius</p>
                                  <div style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, background: inputBg, border: `1px solid ${border}`, color: textPrimary }}>{z.radius}</div>
                                </div>
                                <div>
                                  <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Latitude</p>
                                  <div style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, background: inputBg, border: `1px solid ${border}`, color: textPrimary, fontFamily: 'monospace' }}>{z.lat}</div>
                                </div>
                                <div>
                                  <p style={{ fontSize: 9, fontWeight: 700, color: textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Longitude</p>
                                  <div style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12, background: inputBg, border: `1px solid ${border}`, color: textPrimary, fontFamily: 'monospace' }}>{z.lng}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>No geofencing zones configured.</p>
                      )}
                    </Box>
                  )}

                  {/* Analytics (bonus — not in edit) */}
                  {detail.analytics && (
                    <Box title="Analytics" icon={<BarChart2 size={13} style={{ color: '#4285F4' }} />} bg={sectionBg} border={border}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {[
                          { label: 'Impressions', value: fmtNum(detail.analytics.impressions),     color: '#4285F4' },
                          { label: 'Views',       value: fmtNum(detail.analytics.views),           color: '#7DBB91' },
                          { label: 'Likes',       value: fmtNum(detail.analytics.likes),           color: '#E1306C' },
                          { label: 'Clicks',      value: fmtNum(detail.analytics.clicks),          color: '#FF9F1C' },
                          { label: 'Followers',   value: fmtNum(detail.analytics.followersGained), color: '#F5C518' },
                          { label: 'Spend',       value: fmtINR(detail.analytics.spend),           color: '#7DBB91' },
                        ].map(m => <StatCard key={m.label} label={m.label} value={m.value} color={m.color} isDark={isDark} border={border} />)}
                      </div>
                    </Box>
                  )}

                  {/* Payment (bonus — not in edit) */}
                  {detail.payment && (
                    <Box title="Payment" icon={<CreditCard size={13} style={{ color: '#7DBB91' }} />} bg={sectionBg} border={border}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <StatCard label="Amount Paid" value={fmtINR(detail.payment.amount / 100)} color="#7DBB91" isDark={isDark} border={border} />
                        <div style={{ padding: '10px 12px', borderRadius: 10, background: isDark ? 'rgba(30,30,31,0.80)' : '#F9FAFB', border: `1px solid ${border}` }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: textPrimary, textTransform: 'capitalize' }}>{detail.payment.status}</p>
                          <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</p>
                        </div>
                      </div>
                      {detail.payment.paymentMethod && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Payment Method</p>
                          <div style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary, textTransform: 'capitalize' }}>{detail.payment.paymentMethod}</div>
                        </div>
                      )}
                    </Box>
                  )}
                </>
              )
            })()}

            {/* ── EDIT MODE ── */}
            {!loading && detail && editing && form && (
              <>
                {error && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.30)', color: '#FF6B6B' }}>{error}</div>
                )}

                {/* 1. Campaign Name */}
                <Box title="Campaign Name" icon={<Megaphone size={13} style={{ color: '#F5C518' }} />} bg={sectionBg} border={border}>
                  {inp('Campaign Name', form.name, v => upd('name', v), { placeholder: 'e.g. Summer Food Festival 2025' })}
                </Box>

                {/* 2. Ad Creative */}
                <Box title="Ad Creative" icon={<ImageIcon size={13} style={{ color: '#4285F4' }} />} bg={sectionBg} border={border}>
                  {/* Format toggle */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ad Format</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['reel', 'banner'] as const).map(fmt => (
                        <button key={fmt} onClick={() => upd('adFormat', fmt)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${form.adFormat === fmt ? '#F5C518' : border}`, background: form.adFormat === fmt ? 'rgba(245,197,24,0.10)' : inputBg, color: form.adFormat === fmt ? '#F5C518' : textMuted, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
                          {fmt === 'banner' ? <ImageIcon size={13} /> : <Video size={13} />}
                          {fmt === 'banner' ? 'Banner Ad' : 'Reel / Video Ad'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banner image upload */}
                  {form.adFormat === 'banner' && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Banner Image *</p>
                      <input ref={bannerInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleBannerUpload(f) }} />
                      <div
                        onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
                        style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `2px dashed ${form.bannerUrl ? '#4285F4' : border}`, background: form.bannerUrl ? 'transparent' : inputBg, cursor: uploadingBanner ? 'not-allowed' : 'pointer', minHeight: 100 }}
                      >
                        {form.bannerUrl ? (
                          <>
                            <ProtectedImg src={form.bannerUrl} alt="Banner" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.2s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.45)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '5px 12px', borderRadius: 20 }}>Change Banner</span>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', gap: 8 }}>
                            {uploadingBanner
                              ? <><Loader2 size={22} style={{ color: '#4285F4', animation: 'spin 1s linear infinite' }} /><p style={{ fontSize: 12, fontWeight: 600, color: textMuted, margin: 0 }}>Uploading banner…</p></>
                              : <><Upload size={22} style={{ color: '#4285F4' }} /><p style={{ fontSize: 12, fontWeight: 600, color: textPrimary, margin: 0 }}>Click or drag & drop banner image</p><p style={{ fontSize: 11, color: textMuted, margin: 0 }}>JPG, PNG, WebP — up to 10 MB</p></>
                            }
                          </div>
                        )}
                        {uploadingBanner && form.bannerUrl && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 size={22} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reel / video upload */}
                  {form.adFormat === 'reel' && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ad Video *</p>
                      <input ref={videoInputRef} type="file" accept="video/mp4,video/mov,video/webm,video/quicktime,video/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleVideoUpload(f) }} />
                      <div
                        onClick={() => !uploadingVideo && videoInputRef.current?.click()}
                        style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `2px dashed ${form.adVideoUrl ? '#F5C518' : border}`, background: form.adVideoUrl ? 'transparent' : inputBg, cursor: uploadingVideo ? 'not-allowed' : 'pointer', minHeight: 100 }}
                      >
                        {form.adVideoUrl ? (
                          <>
                            <ProtectedVideo src={form.adVideoUrl} muted playsInline style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block', background: '#000' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.2s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.45)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0)' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '5px 12px', borderRadius: 20 }}>Change Video</span>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', gap: 8 }}>
                            {uploadingVideo
                              ? <><Loader2 size={22} style={{ color: '#F5C518', animation: 'spin 1s linear infinite' }} /><p style={{ fontSize: 12, fontWeight: 600, color: textMuted, margin: 0 }}>Uploading video…</p></>
                              : <><Video size={22} style={{ color: '#F5C518' }} /><p style={{ fontSize: 12, fontWeight: 600, color: textPrimary, margin: 0 }}>Click or drag & drop ad video</p><p style={{ fontSize: 11, color: textMuted, margin: 0 }}>MP4, MOV, WebM — up to 500 MB</p></>
                            }
                          </div>
                        )}
                        {uploadingVideo && form.adVideoUrl && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 size={22} style={{ color: '#fff', animation: 'spin 1s linear infinite' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Media error */}
                  {mediaError && (
                    <p style={{ fontSize: 11, color: '#FF6B6B', margin: 0, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.25)' }}>{mediaError}</p>
                  )}

                  {inp('Campaign Description', form.description, v => upd('description', v), { rows: 3, placeholder: 'Describe your campaign goals and key message…' })}
                  {/* CTA Text presets */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CTA Button Text</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {CTA_OPTIONS.map(c => (
                        <button key={c} onClick={() => upd('ctaText', c)} style={{ padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${form.ctaText === c ? 'rgba(245,197,24,0.50)' : border}`, background: form.ctaText === c ? 'rgba(245,197,24,0.12)' : inputBg, color: form.ctaText === c ? '#F5C518' : textMuted, transition: 'all 0.12s' }}>{c}</button>
                      ))}
                    </div>
                    {inp('Or type custom CTA text', form.ctaText, v => upd('ctaText', v), { placeholder: 'e.g. Get 20% Off' })}
                  </div>
                  {inp('Destination URL', form.destinationUrl, v => upd('destinationUrl', v), { type: 'url', placeholder: 'https://yourwebsite.com' })}
                </Box>

                {/* 3. Objective */}
                <Box title="Campaign Objective" icon={<Target size={13} style={{ color: '#7DBB91' }} />} bg={sectionBg} border={border}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {(['LEADS', 'WEBSITE_TRAFFIC', 'APP_INSTALLS', 'VIDEO_VIEWS', 'PROFILE_VISITS', 'BRAND_AWARENESS', 'ENGAGEMENT', 'REACH', 'CONVERSIONS'] as const).map(obj => (
                      <button key={obj} onClick={() => upd('objective', obj)} style={{ padding: '9px 0', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${form.objective === obj ? '#7DBB91' : border}`, background: form.objective === obj ? 'rgba(125,187,145,0.10)' : inputBg, color: form.objective === obj ? '#7DBB91' : textMuted, fontSize: 11, fontWeight: 700, transition: 'all 0.15s' }}>
                        {OBJECTIVE_LABELS[obj]}
                      </button>
                    ))}
                  </div>
                </Box>

                {/* 4. Budget & Schedule */}
                <Box title="Budget & Schedule" icon={<DollarSign size={13} style={{ color: '#FF9F1C' }} />} bg={sectionBg} border={border}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {inp('Daily Budget (₹)', String(form.dailyBudget), v => upd('dailyBudget', Number(v)), { type: 'number' })}
                    {inp('Total Budget (₹)', String(form.totalBudget), v => upd('totalBudget', Number(v)), { type: 'number' })}
                  </div>
                  {/* Target Impressions */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Impressions</p>
                    <input type="number" min={1000} step={1000} value={form.impressions} onChange={e => upd('impressions', Number(e.target.value))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(245,197,24,0.65)')}
                      onBlur={e => (e.currentTarget.style.borderColor = border)} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {[10000, 50000, 100000, 500000].map(n => (
                        <button key={n} onClick={() => upd('impressions', n)} style={{ flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${form.impressions === n ? 'rgba(245,197,24,0.45)' : border}`, background: form.impressions === n ? 'rgba(245,197,24,0.10)' : inputBg, color: form.impressions === n ? '#F5C518' : textMuted, transition: 'all 0.12s' }}>
                          {n >= 100000 ? `${n / 100000}L` : `${n / 1000}K`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Budget Type */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Budget Type</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['daily', 'lifetime'] as const).map(t => (
                        <button key={t} onClick={() => upd('budgetType', t)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${form.budgetType === t ? '#FF9F1C' : border}`, background: form.budgetType === t ? 'rgba(255,159,28,0.10)' : inputBg, color: form.budgetType === t ? '#FF9F1C' : textMuted, fontSize: 12, fontWeight: 700, textTransform: 'capitalize', transition: 'all 0.15s' }}>
                          {t} Budget
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Duration + Dates + TZ */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {inp('Duration (days)', String(form.durationDays), v => upd('durationDays', Number(v)), { type: 'number' })}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Timezone</p>
                      <select value={form.timezone} onChange={e => upd('timezone', e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary, outline: 'none', boxSizing: 'border-box', appearance: 'none' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(245,197,24,0.65)')}
                        onBlur={e => (e.currentTarget.style.borderColor = border)}>
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                    {inp('Start Date', form.startDate, v => upd('startDate', v), { type: 'date' })}
                    {inp('End Date', form.endDate, v => upd('endDate', v), { type: 'date' })}
                  </div>
                </Box>

                {/* 5. Audience */}
                <Box title="Audience Targeting" icon={<Users size={13} style={{ color: '#E1306C' }} />} bg={sectionBg} border={border}>
                  {/* Countries */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Target Countries</p>
                    <input type="text" placeholder="Search countries…" value={countryQ} onChange={e => setCountryQ(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 12, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(245,197,24,0.65)')}
                      onBlur={e => (e.currentTarget.style.borderColor = border)} />
                    {form.locations.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                        {form.locations.map(l => (
                          <span key={l} onClick={() => toggleArr('locations', l)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(245,197,24,0.12)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.28)', cursor: 'pointer' }}>
                            {l} <X size={10} />
                          </span>
                        ))}
                      </div>
                    )}
                    {countryQ && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {COUNTRIES.filter(c => c.toLowerCase().includes(countryQ.toLowerCase()) && !form.locations.includes(c)).slice(0, 8).map(c => (
                          <button key={c} onClick={() => { toggleArr('locations', c); setCountryQ('') }} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: chipBg, color: textMuted, border: `1px solid ${border}` }}>+ {c}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* State + City */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {inp('State / Province', form.state, v => upd('state', v), { placeholder: 'e.g. Maharashtra' })}
                    {inp('City', form.city, v => upd('city', v), { placeholder: 'e.g. Mumbai' })}
                  </div>

                  {/* Age Range */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Age Range: {form.ageMin} – {form.ageMax === 65 ? '65+' : form.ageMax}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {inp('Min Age', String(form.ageMin), v => upd('ageMin', Math.min(Number(v), form.ageMax - 1)), { type: 'number' })}
                      {inp('Max Age', String(form.ageMax), v => upd('ageMax', Math.max(Number(v), form.ageMin + 1)), { type: 'number' })}
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gender</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ v: 'all', l: 'All' }, { v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }].map(g => (
                        <button key={g.v} onClick={() => upd('gender', g.v)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${form.gender === g.v ? '#E1306C' : border}`, background: form.gender === g.v ? 'rgba(225,48,108,0.10)' : inputBg, color: form.gender === g.v ? '#E1306C' : textMuted, fontSize: 11, fontWeight: 700, transition: 'all 0.15s' }}>
                          {g.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Languages</p>
                    {form.languages.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                        {form.languages.map(l => (
                          <span key={l} onClick={() => toggleArr('languages', l)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(245,197,24,0.12)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.28)', cursor: 'pointer' }}>
                            {l} <X size={10} />
                          </span>
                        ))}
                      </div>
                    )}
                    <input placeholder="Search languages…" value={langQ} onChange={e => setLangQ(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 12, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary, outline: 'none', boxSizing: 'border-box', marginBottom: langQ ? 8 : 0 }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(245,197,24,0.65)')}
                      onBlur={e => (e.currentTarget.style.borderColor = border)} />
                    {langQ && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {LANGUAGES.filter(l => l.toLowerCase().includes(langQ.toLowerCase()) && !form.languages.includes(l)).slice(0, 6).map(l => (
                          <button key={l} onClick={() => { toggleArr('languages', l); setLangQ('') }} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: chipBg, color: textMuted, border: `1px solid ${border}` }}>+ {l}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Interests */}
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interest Tags</p>
                    {form.interests.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                        {form.interests.map(i => (
                          <span key={i} onClick={() => toggleArr('interests', i)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(245,197,24,0.12)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.28)', cursor: 'pointer' }}>
                            {i} <X size={10} />
                          </span>
                        ))}
                      </div>
                    )}
                    <input placeholder="Search interests…" value={interestQ} onChange={e => setInterestQ(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 12, background: inputBg, border: `1.5px solid ${border}`, color: textPrimary, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(245,197,24,0.65)')}
                      onBlur={e => (e.currentTarget.style.borderColor = border)} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {INTERESTS.filter(i => i.toLowerCase().includes(interestQ.toLowerCase()) && !form.interests.includes(i)).slice(0, 12).map(i => (
                        <button key={i} onClick={() => toggleArr('interests', i)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: chipBg, color: textMuted, border: `1px solid ${border}`, transition: 'all 0.12s' }}>+ {i}</button>
                      ))}
                    </div>
                  </div>
                </Box>

                {/* 6. Geofencing Zones */}
                {isGeo && (
                  <Box title="Geofencing Zones" icon={<MapPin size={13} style={{ color: '#7DBB91' }} />} bg={sectionBg} border={border}>
                    <p style={{ fontSize: 11, color: textMuted, margin: 0 }}>Add physical locations to target users in a specific area.</p>
                    {form.geofences.map((zone, idx) => (
                      <div key={zone.id} style={{ padding: '12px', borderRadius: 10, background: isDark ? 'rgba(30,30,31,0.80)' : '#F9FAFB', border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#7DBB91', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Zone {idx + 1}</span>
                          <button onClick={() => rmGeo(zone.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF6B6B', display: 'flex' }}><Trash2 size={13} /></button>
                        </div>
                        {inp('Location Name', zone.name, v => updGeo(zone.id, 'name', v), { placeholder: 'e.g. Connaught Place' })}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {inp('Latitude', zone.lat, v => updGeo(zone.id, 'lat', v))}
                          {inp('Longitude', zone.lng, v => updGeo(zone.id, 'lng', v))}
                        </div>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Radius</p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {RADIUS_OPTS.map(r => (
                              <button key={r} onClick={() => updGeo(zone.id, 'radius', r)} style={{ padding: '5px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${zone.radius === r ? '#7DBB91' : border}`, background: zone.radius === r ? 'rgba(125,187,145,0.12)' : inputBg, color: zone.radius === r ? '#7DBB91' : textMuted, transition: 'all 0.12s' }}>{r}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={addGeoZone} style={{ width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer', border: '1.5px dashed rgba(125,187,145,0.40)', color: '#7DBB91', background: 'rgba(125,187,145,0.05)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Plus size={14} /> Add Geofence Zone
                    </button>
                  </Box>
                )}
              </>
            )}
          </div>

          {/* ── Footer ── */}
          {!loading && detail && (
            <div style={{ padding: '12px 18px', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
              {editing ? (
                <>
                  <button onClick={() => { setEditing(false); setError('') }} disabled={saving}
                    style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: isDark ? 'rgba(52,52,56,0.80)' : '#F5F5F5', color: isDark ? '#A1A1AA' : '#666', border: 'none', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.75 : 1, boxShadow: '0 4px 14px rgba(245,197,24,0.35)' }}>
                    {saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={13} /> Save Changes</>}
                  </button>
                </>
              ) : (
                <button onClick={onClose}
                  style={{ padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: isDark ? 'rgba(52,52,56,0.80)' : '#F5F5F5', color: isDark ? '#A1A1AA' : '#666', border: 'none', cursor: 'pointer' }}>
                  Close
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Box({ title, icon, bg, border, children }: { title: string; icon: React.ReactNode; bg: string; border: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 12, padding: '12px 14px', background: bg, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 800, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Row({ label, muted, children }: { label: string; muted: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: muted, minWidth: 100, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

function Val({ children, c, caps }: { children: React.ReactNode; c: string; caps?: boolean }) {
  return <span style={{ fontSize: 12, fontWeight: 600, color: c, textTransform: caps ? 'capitalize' : undefined }}>{children}</span>
}

function Chip({ children, bg, color, border }: { children: React.ReactNode; bg: string; color: string; border: string }) {
  return (
    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: bg, color, border: `1px solid ${border}` }}>{children}</span>
  )
}

function StatCard({ label, value, color, isDark, border }: { label: string; value: string; color: string; isDark: boolean; border: string }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: isDark ? 'rgba(30,30,31,0.80)' : '#F9FAFB', border: `1px solid ${border}` }}>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color, fontFamily: 'var(--font-poppins), sans-serif' }}>{value}</p>
      <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 700, color: isDark ? '#52525B' : '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  )
}
