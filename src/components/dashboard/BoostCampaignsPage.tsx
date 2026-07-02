'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import {
  ArrowLeft, Plus, Megaphone, Search, FileText, CheckCircle2, Clock,
  XCircle, Eye, MousePointer, DollarSign, Zap, Target, MoreHorizontal,
  PenLine, Pause, Trash2, Play, Filter, TrendingUp, Smartphone,
} from 'lucide-react'
import CampaignDetailModal from './CampaignDetailModal'
import CampaignPreviewModal from './CampaignPreviewModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  name: string
  platform: string
  status: 'active' | 'pending' | 'draft' | 'paused' | 'completed' | 'rejected'
  budget: number
  impressions: number
  clicks: number
  createdAt: string
}

interface BoostStats {
  activeCampaigns: number
  draftCampaigns: number
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  totalLeads: number
  campaigns: Campaign[]
}

type StatusFilter = 'all' | 'active' | 'pending' | 'draft' | 'paused' | 'completed' | 'rejected'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatINR(n: number): string {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n.toFixed(0)}`
}

const STATUS_CFG: Record<Campaign['status'], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:    { label: 'Live',           color: '#7DBB91', bg: 'rgba(125,187,145,0.15)', icon: CheckCircle2 },
  pending:   { label: 'Pending Review', color: '#F5C518', bg: 'rgba(245,197,24,0.15)',  icon: Clock },
  draft:     { label: 'Draft',          color: '#A1A1AA', bg: 'rgba(161,161,170,0.15)', icon: FileText },
  paused:    { label: 'Paused',         color: '#FF9F1C', bg: 'rgba(255,159,28,0.15)',  icon: Pause },
  completed: { label: 'Completed',      color: '#4285F4', bg: 'rgba(66,133,244,0.15)',  icon: CheckCircle2 },
  rejected:  { label: 'Rejected',       color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', icon: XCircle },
}

const PLATFORM_COLORS: Record<string, string> = {
  cookreels: '#F5C518', meta: '#E1306C', google: '#4285F4', geofencing: '#7DBB91',
}

const PLATFORM_LABELS: Record<string, string> = {
  cookreels: 'CookReels', meta: 'Meta', google: 'Google', geofencing: 'Geofencing',
}

const TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'active',    label: 'Live' },
  { id: 'pending',   label: 'Pending' },
  { id: 'draft',     label: 'Draft' },
  { id: 'paused',    label: 'Paused' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected',  label: 'Rejected' },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Shimmer({ isDark }: { isDark: boolean }) {
  return (
    <div className="h-16 rounded-xl" style={{
      background: isDark ? 'rgba(52,52,56,0.4)' : 'rgba(0,0,0,0.04)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

// ─── Delete Confirm Inline ────────────────────────────────────────────────────

function DeleteConfirm({ isDark, onConfirm, onCancel }: {
  isDark: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ duration: 0.14 }}
      className="absolute right-0 top-8 z-20 w-52 rounded-xl p-3 shadow-2xl"
      style={{
        background: isDark ? '#2B2B2D' : '#fff',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.20)',
      }}
    >
      <p className="text-xs font-semibold mb-2.5" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
        Delete this campaign?
      </p>
      <p className="text-[11px] mb-3" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        This action cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: isDark ? 'rgba(52,52,56,0.80)' : '#F5F5F5',
            color: isDark ? '#A1A1AA' : '#666',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,107,107,0.15)', color: '#FF6B6B' }}
        >
          Delete
        </button>
      </div>
    </motion.div>
  )
}

// ─── Campaign Row ─────────────────────────────────────────────────────────────

function CampaignRow({ c, isDark, onRefresh, onOpen, onPreview }: {
  c: Campaign; isDark: boolean; onRefresh: () => void
  onOpen: (id: string, editMode?: boolean) => void
  onPreview: (id: string) => void
}) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [confirming, setConfirming]   = useState(false)
  const [acting, setActing]           = useState(false)

  const cfg = STATUS_CFG[c.status]
  const StatusIcon = cfg.icon
  const pColor = PLATFORM_COLORS[c.platform] ?? '#F5C518'
  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00'

  const doStatusAction = async (action: 'pause' | 'resume') => {
    setMenuOpen(false)
    setActing(true)
    await fetch(`/api/campaigns/${c.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActing(false)
    onRefresh()
  }

  const doDelete = async () => {
    setConfirming(false)
    setActing(true)
    await fetch(`/api/campaigns/${c.id}`, { method: 'DELETE' })
    setActing(false)
    onRefresh()
  }

  const menuItems = [
    { icon: Eye,       label: 'View',    onClick: () => { setMenuOpen(false); onOpen(c.id) } },
    { icon: Smartphone, label: 'Preview', onClick: () => { setMenuOpen(false); onPreview(c.id) } },
    ...(c.status === 'draft' || c.status === 'paused'
      ? [{ icon: PenLine, label: 'Edit', onClick: () => { setMenuOpen(false); onOpen(c.id, true) } }]
      : []),
    ...(c.status === 'active' ? [{ icon: Pause, label: 'Pause',  onClick: () => doStatusAction('pause') }] : []),
    ...(c.status === 'paused' ? [{ icon: Play,  label: 'Resume', onClick: () => doStatusAction('resume') }] : []),
    { icon: Trash2, label: 'Delete', onClick: () => { setMenuOpen(false); setConfirming(true) }, danger: true },
  ]

  const platformLabel = PLATFORM_LABELS[c.platform] ?? c.platform

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group px-4 py-3 rounded-xl transition-colors"
      style={{
        border: `1px solid ${isDark ? '#343438' : '#F0F0F0'}`,
        opacity: acting ? 0.6 : 1,
        pointerEvents: acting ? 'none' : 'auto',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.35)' : 'rgba(245,197,24,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex items-center">

        {/* Campaign — flex-1, matches header */}
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
            {c.name}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Platform — w-28, matches header */}
        <div className="hidden lg:flex w-28 justify-start flex-shrink-0">
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ background: `${pColor}20`, color: pColor, border: `1px solid ${pColor}35` }}
          >
            {platformLabel}
          </span>
        </div>

        {/* Status — w-36, matches header */}
        <div className="hidden sm:flex w-36 justify-center flex-shrink-0">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            <StatusIcon size={10} strokeWidth={2.5} />
            {cfg.label}
          </span>
        </div>

        {/* Impr. — w-20, matches header */}
        <div className="hidden lg:block w-20 text-right flex-shrink-0">
          <p className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{formatNum(c.impressions)}</p>
        </div>

        {/* Clicks — w-20, matches header */}
        <div className="hidden lg:block w-20 text-right flex-shrink-0">
          <p className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{formatNum(c.clicks)}</p>
        </div>

        {/* CTR — w-16, matches header */}
        <div className="hidden lg:block w-16 text-right flex-shrink-0">
          <p className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{ctr}%</p>
        </div>

        {/* Budget — w-20, matches header */}
        <div className="hidden lg:block w-20 text-right flex-shrink-0 pr-1">
          <p className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{formatINR(c.budget)}</p>
        </div>

        {/* Actions — w-8, matches header spacer */}
        <div className="relative w-8 flex-shrink-0 flex justify-center">
          <button
            onClick={() => { setMenuOpen(o => !o); setConfirming(false) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: isDark ? '#71717A' : '#9CA3AF' }}
          >
            <MoreHorizontal size={15} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-8 z-20 w-40 rounded-xl py-1 shadow-2xl"
                  style={{
                    background: isDark ? '#2B2B2D' : '#fff',
                    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.20)',
                  }}
                >
                  {menuItems.map(action => (
                    <button key={action.label} onClick={(action as { onClick?: () => void }).onClick}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors"
                      style={{ color: (action as { danger?: boolean }).danger ? '#FF6B6B' : (isDark ? '#A1A1AA' : '#666') }}
                      onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.60)' : '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <action.icon size={13} />{action.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {confirming && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setConfirming(false)} />
                <div className="z-20">
                  <DeleteConfirm
                    isDark={isDark}
                    onConfirm={doDelete}
                    onCancel={() => setConfirming(false)}
                  />
                </div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isDark, filtered }: { isDark: boolean; filtered: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'rgba(245,197,24,0.10)', border: '1.5px dashed rgba(245,197,24,0.35)' }}>
          <Megaphone size={32} style={{ color: 'rgba(245,197,24,0.55)' }} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.30)' }}>
          <Plus size={14} style={{ color: '#F5C518' }} />
        </div>
      </div>
      <h4 className="text-base font-bold mb-1.5"
        style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
        {filtered ? 'No matching campaigns' : 'No campaigns yet'}
      </h4>
      <p className="text-sm text-center mb-6 max-w-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        {filtered
          ? 'Try changing your filter or search query.'
          : "Create your first campaign and start reaching food lovers. It's fast and easy."}
      </p>
      {!filtered && (
        <Link href="/boost/create">
          <motion.span whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 4px 16px rgba(245,197,24,0.35)' }}>
            <Plus size={15} /> Create Your First Campaign
          </motion.span>
        </Link>
      )}
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BoostCampaignsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()

  const [stats, setStats]       = useState<BoostStats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<StatusFilter>('all')
  const [search, setSearch]     = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [modalId, setModalId]         = useState<string | null>(null)
  const [modalEditMode, setModalEditMode] = useState(false)
  const [previewId, setPreviewId]     = useState<string | null>(null)

  const openModal = (id: string, editMode = false) => {
    setModalId(id)
    setModalEditMode(editMode)
  }
  const closeModal = () => setModalId(null)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    setLoading(true)
    fetch('/api/boost/stats')
      .then(r => r.json())
      .then((d: BoostStats) => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refreshKey])

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
    backdropFilter: 'blur(20px)',
    boxShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(52,52,56,0.80)'
      : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
  }

  const allCampaigns = stats?.campaigns ?? []
  const tabFiltered  = tab === 'all' ? allCampaigns : allCampaigns.filter(c => c.status === tab)
  const filtered     = search.trim()
    ? tabFiltered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.platform.toLowerCase().includes(search.toLowerCase()))
    : tabFiltered

  const statCards = [
    { label: 'Total Campaigns',   value: String(allCampaigns.length),              icon: Megaphone,      color: '#F5C518' },
    { label: 'Live',              value: String(stats?.activeCampaigns ?? 0),       icon: Zap,            color: '#7DBB91' },
    { label: 'Total Impressions', value: formatNum(stats?.totalImpressions ?? 0),   icon: Eye,            color: '#4285F4' },
    { label: 'Total Clicks',      value: formatNum(stats?.totalClicks ?? 0),        icon: MousePointer,   color: '#7DBB91' },
    { label: 'Total Spend',       value: formatINR(stats?.totalSpend ?? 0),         icon: DollarSign,     color: '#FF9F1C' },
    { label: 'Total Leads',       value: formatNum(stats?.totalLeads ?? 0),         icon: Target,         color: '#E1306C' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => router.push('/boost')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: isDark ? 'rgba(43,43,45,0.80)' : 'rgba(255,255,255,0.90)',
              border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
              color: isDark ? '#A1A1AA' : '#666',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.50)'; e.currentTarget.style.color = '#F5C518' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? '#343438' : '#E8E8E8'; e.currentTarget.style.color = isDark ? '#A1A1AA' : '#666' }}
          >
            <ArrowLeft size={13} /> Back to Boost
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.30)' }}>
                <FileText size={14} style={{ color: '#F5C518' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
                My Campaigns
              </h1>
            </div>
            <p className="text-xs mt-0.5 ml-9" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
              View and manage all your advertising campaigns
            </p>
          </div>
          <div className="ml-auto">
            <Link href="/boost/create">
              <motion.span whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 4px 14px rgba(245,197,24,0.35)' }}>
                <Plus size={14} /> New Campaign
              </motion.span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl p-3.5" style={cardStyle}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                <Icon size={15} style={{ color: s.color }} />
              </div>
              {loading ? (
                <div className="h-6 w-14 rounded-lg" style={{ background: isDark ? 'rgba(52,52,56,0.5)' : '#F0F0F0' }} />
              ) : (
                <>
                  <p className="text-xl font-bold leading-none" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>{s.value}</p>
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: isDark ? '#52525B' : '#A1A1AA' }}>{s.label}</p>
                </>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Campaign list card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl" style={cardStyle}
      >
        {/* Top bar: search + filter */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
            <input
              className="w-full rounded-xl pl-8 pr-3.5 py-2 text-sm outline-none"
              placeholder="Search campaigns…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)',
                border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                color: isDark ? '#F5F5F5' : '#1A1A1A',
              }}
            />
          </div>
          <div className="flex items-center gap-1.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            <Filter size={14} />
            <span className="text-xs font-medium">{filtered.length} results</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#A1A1AA' : '#666' }}>
            <TrendingUp size={12} /> Sorted by newest
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2.5 flex gap-1 overflow-x-auto" style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1.5"
              style={tab === t.id ? {
                background: 'rgba(245,197,24,0.15)',
                border: '1px solid rgba(245,197,24,0.40)',
                color: '#F5C518',
              } : {
                color: isDark ? '#71717A' : '#9CA3AF',
                border: '1px solid transparent',
              }}
            >
              {t.label}
              {t.id !== 'all' && stats && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px]"
                  style={{ background: isDark ? '#343438' : '#F0F0F0', color: isDark ? '#A1A1AA' : '#666' }}>
                  {allCampaigns.filter(c => c.status === t.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => <Shimmer key={i} isDark={isDark} />)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-1.5">
              {/* Column headers — widths must mirror CampaignRow exactly */}
              <div className="hidden lg:flex items-center px-4 pb-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>
                <div className="flex-1">Campaign</div>
                <div className="w-28 flex-shrink-0">Platform</div>
                <div className="w-36 text-center flex-shrink-0">Status</div>
                <div className="w-20 text-right flex-shrink-0">Impr.</div>
                <div className="w-20 text-right flex-shrink-0">Clicks</div>
                <div className="w-16 text-right flex-shrink-0">CTR</div>
                <div className="w-20 text-right flex-shrink-0 pr-1">Budget</div>
                <div className="w-8 flex-shrink-0" />
              </div>
              {filtered.map(c => <CampaignRow key={c.id} c={c} isDark={isDark} onRefresh={refresh} onOpen={openModal} onPreview={setPreviewId} />)}
            </div>
          ) : (
            <EmptyState isDark={isDark} filtered={search.trim().length > 0 || tab !== 'all'} />
          )}
        </div>
      </motion.div>

      <CampaignDetailModal
        campaignId={modalId}
        startInEditMode={modalEditMode}
        onClose={closeModal}
        onRefresh={refresh}
      />

      <CampaignPreviewModal
        campaignId={previewId}
        onClose={() => setPreviewId(null)}
      />
    </div>
  )
}
