'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import WhyAdvertiseCookReels from '@/components/dashboard/WhyAdvertiseCookReels'
import { useTheme } from '@/context/ThemeContext'
import {
  Megaphone, Rocket, BarChart2, Users, MapPin, TrendingUp, Globe,
  Eye, MousePointer, DollarSign, Target, Zap, ChevronRight,
  Plus, Play, PenLine, Copy, Pause, Trash2, MoreHorizontal,
  CheckCircle2, Clock, AlertCircle, XCircle, FileText, Film,
  ArrowRight, Sparkles,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BoostStats {
  activeCampaigns: number
  draftCampaigns: number
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  totalLeads: number
  campaigns: Campaign[]
}

interface Campaign {
  id: string
  name: string
  platform: string
  status: 'active' | 'pending' | 'draft' | 'completed' | 'rejected'
  budget: number
  impressions: number
  clicks: number
  createdAt: string
}

type CampaignTab = 'all' | 'active' | 'pending' | 'draft' | 'completed' | 'rejected'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)    return `${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000)       return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatINR(n: number): string {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000)    return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n.toFixed(0)}`
}

const STATUS_CONFIG: Record<Campaign['status'], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:    { label: 'Active',         color: '#7DBB91', bg: 'rgba(125,187,145,0.15)', icon: CheckCircle2 },
  pending:   { label: 'Pending Review', color: '#F5C518', bg: 'rgba(245,197,24,0.15)',  icon: Clock },
  draft:     { label: 'Draft',          color: '#A1A1AA', bg: 'rgba(161,161,170,0.15)', icon: FileText },
  completed: { label: 'Completed',      color: '#4285F4', bg: 'rgba(66,133,244,0.15)',  icon: CheckCircle2 },
  rejected:  { label: 'Rejected',       color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', icon: XCircle },
}

const PLATFORM_COLORS: Record<string, string> = {
  cookreels:  '#F5C518',
  meta:       '#E1306C',
  google:     '#4285F4',
  geofencing: '#7DBB91',
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className, isDark }: { className: string; isDark: boolean }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        backgroundImage: isDark
          ? 'linear-gradient(90deg, rgba(52,52,56,0) 0%, rgba(52,52,56,0.5) 50%, rgba(52,52,56,0) 100%)'
          : 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer-move 1.8s linear infinite',
      }}
    />
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, sub, loading, isDark, delay }: {
  label: string
  value: string
  icon: React.ElementType
  color: string
  sub?: string
  loading: boolean
  isDark: boolean
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl p-4"
      style={{
        background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        backdropFilter: 'blur(20px)',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(52,52,56,0.80)'
          : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={17} style={{ color }} />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-7 w-20 mb-1.5" isDark={isDark} />
          <Skeleton className="h-3.5 w-16" isDark={isDark} />
        </>
      ) : (
        <>
          <p
            className="text-2xl font-bold mb-0.5"
            style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}
          >
            {value}
          </p>
          <p className="text-xs font-semibold" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            {label}
          </p>
          {sub && <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#52525B' : '#D1D5DB' }}>{sub}</p>}
        </>
      )}
    </motion.div>
  )
}

// ─── Feature Cards ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Film,
    title: 'Promote Your Reels',
    desc: 'Get more views and engagement on your cooking content. Reach food lovers who are actively discovering new recipes.',
    color: '#F5C518',
    gradient: 'linear-gradient(135deg, rgba(245,197,24,0.12), rgba(255,184,0,0.06))',
  },
  {
    icon: MapPin,
    title: 'Reach Local Customers',
    desc: 'Target users in specific cities, neighbourhoods, and locations using geofencing and radius targeting.',
    color: '#7DBB91',
    gradient: 'linear-gradient(135deg, rgba(125,187,145,0.12), rgba(125,187,145,0.06))',
  },
  {
    icon: Globe,
    title: 'Multi-Platform Advertising',
    desc: 'Run campaigns across CookReels, Meta, Google, and Geofencing from one unified dashboard.',
    color: '#4285F4',
    gradient: 'linear-gradient(135deg, rgba(66,133,244,0.12), rgba(66,133,244,0.06))',
  },
  {
    icon: BarChart2,
    title: 'Track Results',
    desc: 'Monitor impressions, clicks, engagement, leads and conversions in real-time with detailed analytics.',
    color: '#FF9F1C',
    gradient: 'linear-gradient(135deg, rgba(255,159,28,0.12), rgba(255,159,28,0.06))',
  },
]

const QUICK_ACTIONS = [
  { icon: Plus,       label: 'Create Campaign', sub: 'Launch a new ad',        href: '/boost/create',    color: '#F5C518' },
  { icon: BarChart2,  label: 'Analytics',       sub: 'View performance',        href: '/boost/analytics', color: '#4285F4' },
  { icon: Users,      label: 'Leads',           sub: 'Manage leads',            href: '/boost/leads',     color: '#7DBB91' },
  { icon: DollarSign, label: 'Billing',         sub: 'Payments & invoices',     href: '/boost/billing',   color: '#FF9F1C' },
]

const TABS: { id: CampaignTab; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'active',    label: 'Active' },
  { id: 'pending',   label: 'Pending Review' },
  { id: 'draft',     label: 'Draft' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected',  label: 'Rejected' },
]

// ─── Campaign Row ─────────────────────────────────────────────────────────────

function CampaignRow({ campaign, isDark }: { campaign: Campaign; isDark: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const status = STATUS_CONFIG[campaign.status]
  const StatusIcon = status.icon
  const platformColor = PLATFORM_COLORS[campaign.platform] ?? '#F5C518'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group"
      style={{ border: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}
      onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.40)' : 'rgba(245,197,24,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Platform dot */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: platformColor }} />

      {/* Name + platform */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
          {campaign.name}
        </p>
        <p className="text-[11px] capitalize" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
          {campaign.platform}
        </p>
      </div>

      {/* Status badge */}
      <span
        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
        style={{ background: status.bg, color: status.color }}
      >
        <StatusIcon size={10} strokeWidth={2.5} />
        {status.label}
      </span>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-4 text-xs flex-shrink-0">
        <div className="text-right">
          <p className="font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{formatNumber(campaign.impressions)}</p>
          <p style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Impressions</p>
        </div>
        <div className="text-right">
          <p className="font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{formatNumber(campaign.clicks)}</p>
          <p style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Clicks</p>
        </div>
        <div className="text-right">
          <p className="font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{formatINR(campaign.budget)}</p>
          <p style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Budget</p>
        </div>
      </div>

      {/* Actions menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          style={{ color: isDark ? '#71717A' : '#9CA3AF' }}
          onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.80)' : '#F5F5F5')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-8 z-20 w-40 rounded-xl py-1 shadow-2xl"
                style={{
                  background: isDark ? '#2B2B2D' : '#fff',
                  border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.20)',
                }}
              >
                {[
                  { icon: Eye,     label: 'View',      href: `/boost/create?id=${campaign.id}` },
                  { icon: PenLine, label: 'Edit',       href: `/boost/create?id=${campaign.id}&edit=true` },
                  { icon: Copy,    label: 'Duplicate',  onClick: () => setMenuOpen(false) },
                  { icon: Pause,   label: campaign.status === 'active' ? 'Pause' : 'Resume', onClick: () => setMenuOpen(false) },
                  { icon: Trash2,  label: 'Delete',     onClick: () => setMenuOpen(false), danger: true },
                ].map(action => (
                  action.href ? (
                    <Link
                      key={action.label}
                      href={action.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors"
                      style={{ color: isDark ? '#A1A1AA' : '#666' }}
                      onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.60)' : '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <action.icon size={13} />
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors"
                      style={{ color: (action as { danger?: boolean }).danger ? '#FF6B6B' : (isDark ? '#A1A1AA' : '#666') }}
                      onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.60)' : '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <action.icon size={13} />
                      {action.label}
                    </button>
                  )
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isDark, tab }: { isDark: boolean; tab: CampaignTab }) {
  const messages: Record<CampaignTab, { title: string; sub: string }> = {
    all:       { title: 'No campaigns yet',          sub: 'Create your first campaign to start reaching your audience.' },
    active:    { title: 'No active campaigns',       sub: 'Launch a campaign to see it appear here.' },
    pending:   { title: 'Nothing pending review',    sub: 'Submitted campaigns awaiting approval will show here.' },
    draft:     { title: 'No drafts saved',           sub: 'Campaigns you save as drafts will appear here.' },
    completed: { title: 'No completed campaigns',    sub: 'Finished campaigns and their results will appear here.' },
    rejected:  { title: 'No rejected campaigns',     sub: 'Any campaigns that were rejected will appear here.' },
  }
  const { title, sub } = messages[tab]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Illustration */}
      <div className="relative mb-6">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'rgba(245,197,24,0.10)',
            border: '1.5px dashed rgba(245,197,24,0.35)',
          }}
        >
          <Megaphone size={32} style={{ color: 'rgba(245,197,24,0.60)' }} />
        </div>
        <div
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.30)' }}
        >
          <Plus size={14} style={{ color: '#F5C518' }} />
        </div>
      </div>

      <h4
        className="text-base font-bold mb-1.5"
        style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}
      >
        {title}
      </h4>
      <p className="text-sm text-center mb-5 max-w-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        {sub}
      </p>

      {(tab === 'all' || tab === 'draft') && (
        <Link href="/boost/create">
          <motion.span
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #F5C518, #FFB800)',
              color: '#1A1A1A',
              boxShadow: '0 4px 16px rgba(245,197,24,0.35)',
            }}
          >
            <Plus size={15} /> Create Your First Campaign
          </motion.span>
        </Link>
      )}
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BoostCenter({ username }: { username: string }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()
  const featuresRef = useRef<HTMLDivElement>(null)

  const [stats, setStats] = useState<BoostStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<CampaignTab>('all')

  useEffect(() => {
    fetch('/api/boost/stats')
      .then(r => r.json())
      .then((data: BoostStats) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filteredCampaigns = (stats?.campaigns ?? []).filter(
    c => activeTab === 'all' || c.status === activeTab
  )

  const draftCampaigns = (stats?.campaigns ?? []).filter(c => c.status === 'draft')

  const cardStyle = {
    background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
    backdropFilter: 'blur(20px)',
    boxShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(52,52,56,0.80)'
      : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
  }

  return (
    <div className="relative max-w-7xl mx-auto space-y-6 pb-10">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-32 right-0 w-96 h-96 rounded-full opacity-[0.04] animate-blob"
          style={{ background: 'radial-gradient(circle, #F5C518, transparent)' }}
        />
        <div
          className="absolute top-1/2 -left-32 w-80 h-80 rounded-full opacity-[0.03] animate-blob-alt"
          style={{ background: 'radial-gradient(circle, #FF9F1C, transparent)' }}
        />
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(43,43,45,0.90) 0%, rgba(30,30,31,0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(247,241,217,0.90) 100%)',
          border: `1px solid ${isDark ? '#343438' : 'rgba(245,197,24,0.20)'}`,
          boxShadow: isDark
            ? '0 8px 48px rgba(0,0,0,0.40)'
            : '0 8px 48px rgba(245,197,24,0.10), 0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Background gradient accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(245,197,24,0.08), transparent)',
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? '#F5C518' : '#1A1A1A'} 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative px-6 py-8 md:px-10 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            {/* Text */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #F5C518, #FFB800)',
                    boxShadow: '0 8px 24px rgba(245,197,24,0.40)',
                  }}
                >
                  <Megaphone size={18} className="text-[#1A1A1A]" strokeWidth={2.2} />
                </div>
                <span
                  className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(245,197,24,0.15)', color: '#F5C518', border: '1px solid rgba(245,197,24,0.30)' }}
                >
                  Boost Center
                </span>
              </div>

              <div>
                <h1
                  className="text-3xl md:text-4xl font-bold leading-tight"
                  style={{ fontFamily: 'var(--font-poppins), sans-serif', color: isDark ? '#F5F5F5' : '#1A1A1A' }}
                >
                  Boost Your Business
                  <span className="block text-gradient-yellow">with CookReels</span>
                </h1>
                <p className="mt-3 text-base leading-relaxed max-w-lg" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
                  Reach food lovers, home chefs, restaurant customers, and local audiences through targeted advertising on CookReels and beyond.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push('/boost/create')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #F5C518 0%, #FFD84D 50%, #FFB800 100%)',
                    color: '#1A1A1A',
                    boxShadow: '0 8px 28px rgba(245,197,24,0.40), 0 2px 6px rgba(245,197,24,0.25)',
                    fontFamily: 'var(--font-poppins), sans-serif',
                  }}
                >
                  <Rocket size={16} strokeWidth={2.2} />
                  Create New Campaign
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all"
                  style={{
                    background: isDark ? 'rgba(52,52,56,0.80)' : 'rgba(255,255,255,0.90)',
                    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                    color: isDark ? '#A1A1AA' : '#666',
                  }}
                >
                  Learn More <ChevronRight size={15} />
                </motion.button>
              </div>
            </div>

            {/* Hero graphic */}
            <div className="hidden md:flex flex-shrink-0 items-center justify-center">
              <div className="relative w-44 h-44">
                {/* Outer ring */}
                <div
                  className="absolute inset-0 rounded-full border-2 animate-spin-slow"
                  style={{ borderColor: 'rgba(245,197,24,0.20)', borderTopColor: 'rgba(245,197,24,0.60)' }}
                />
                {/* Middle ring */}
                <div
                  className="absolute inset-4 rounded-full border border-dashed"
                  style={{ borderColor: 'rgba(245,197,24,0.15)', animation: 'spin-slow 12s linear infinite reverse' }}
                />
                {/* Center */}
                <div
                  className="absolute inset-8 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #F5C518, #FFB800)',
                    boxShadow: '0 0 40px rgba(245,197,24,0.45)',
                  }}
                >
                  <Megaphone size={32} className="text-[#1A1A1A]" strokeWidth={2} />
                </div>
                {/* Orbit icons */}
                {[
                  { icon: Globe,      angle: 0,   color: '#4285F4' },
                  { icon: Users,      angle: 90,  color: '#E1306C' },
                  { icon: BarChart2,  angle: 180, color: '#7DBB91' },
                  { icon: MapPin,     angle: 270, color: '#FF9F1C' },
                ].map(({ icon: OIcon, angle, color }) => {
                  const rad = (angle * Math.PI) / 180
                  const r = 72
                  const x = 88 + r * Math.cos(rad) - 14
                  const y = 88 + r * Math.sin(rad) - 14
                  return (
                    <div
                      key={angle}
                      className="absolute w-7 h-7 rounded-xl flex items-center justify-center"
                      style={{
                        left: x,
                        top: y,
                        background: `${color}20`,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      <OIcon size={13} style={{ color }} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Active Campaigns',   value: String(stats?.activeCampaigns ?? 0),       icon: Zap,          color: '#F5C518', key: 'active' },
          { label: 'Draft Campaigns',    value: String(stats?.draftCampaigns ?? 0),         icon: FileText,     color: '#A1A1AA', key: 'draft' },
          { label: 'Total Impressions',  value: formatNumber(stats?.totalImpressions ?? 0), icon: Eye,          color: '#4285F4', key: 'imp' },
          { label: 'Total Clicks',       value: formatNumber(stats?.totalClicks ?? 0),       icon: MousePointer, color: '#7DBB91', key: 'clicks' },
          { label: 'Total Spend',        value: formatINR(stats?.totalSpend ?? 0),            icon: DollarSign,   color: '#FF9F1C', key: 'spend' },
          { label: 'Total Leads',        value: formatNumber(stats?.totalLeads ?? 0),         icon: Target,       color: '#E1306C', key: 'leads' },
        ].map((s, i) => (
          <StatCard
            key={s.key}
            label={s.label}
            value={s.value}
            icon={s.icon}
            color={s.color}
            loading={loading}
            isDark={isDark}
            delay={i * 0.06}
          />
        ))}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl p-5"
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-base font-bold"
            style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}
          >
            Quick Actions
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon
            return (
              <Link key={action.label} href={action.href}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex flex-col items-center text-center gap-2.5 p-4 rounded-2xl cursor-pointer transition-all"
                  style={{
                    background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(245,245,245,0.70)',
                    border: `1px solid ${isDark ? '#343438' : '#F0F0F0'}`,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.background = isDark ? 'rgba(52,52,56,0.60)' : `${action.color}08`
                    el.style.borderColor = `${action.color}40`
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.background = isDark ? 'rgba(30,30,31,0.60)' : 'rgba(245,245,245,0.70)'
                    el.style.borderColor = isDark ? '#343438' : '#F0F0F0'
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${action.color}18`, border: `1px solid ${action.color}30` }}
                  >
                    <Icon size={18} style={{ color: action.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{action.label}</p>
                    <p className="text-[11px]" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{action.sub}</p>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </motion.div>

      {/* ── Campaigns ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl overflow-hidden"
        style={cardStyle}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}
        >
          <h3
            className="text-base font-bold"
            style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}
          >
            Your Campaigns
          </h3>
          <Link href="/boost/create">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #F5C518, #FFB800)',
                color: '#1A1A1A',
                boxShadow: '0 4px 12px rgba(245,197,24,0.30)',
              }}
            >
              <Plus size={13} /> New Campaign
            </motion.span>
          </Link>
        </div>

        {/* Tabs */}
        <div
          className="px-5 py-3 flex gap-1 overflow-x-auto scrollbar-none"
          style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={activeTab === tab.id ? {
                background: 'rgba(245,197,24,0.15)',
                border: '1px solid rgba(245,197,24,0.40)',
                color: '#F5C518',
              } : {
                color: isDark ? '#71717A' : '#9CA3AF',
                border: '1px solid transparent',
              }}
            >
              {tab.label}
              {tab.id !== 'all' && stats && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{ background: isDark ? '#343438' : '#F0F0F0' }}>
                  {(stats.campaigns ?? []).filter(c => c.status === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Campaign list */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-14" isDark={isDark} />
              ))}
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <div className="space-y-1.5">
              {filteredCampaigns.map(c => (
                <CampaignRow key={c.id} campaign={c} isDark={isDark} />
              ))}
            </div>
          ) : (
            <EmptyState isDark={isDark} tab={activeTab} />
          )}
        </div>
      </motion.div>

      {/* ── Drafts ────────────────────────────────────────────────────────── */}
      {draftCampaigns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="rounded-2xl p-5"
          style={cardStyle}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(161,161,170,0.15)' }}>
                <FileText size={14} style={{ color: '#A1A1AA' }} />
              </div>
              <h3
                className="text-base font-bold"
                style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}
              >
                Draft Campaigns
              </h3>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(161,161,170,0.15)', color: '#A1A1AA' }}
              >
                {draftCampaigns.length}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {draftCampaigns.map(draft => (
              <div
                key={draft.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(245,245,245,0.70)', border: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
                    {draft.name || 'Untitled Draft'}
                  </p>
                  <p className="text-[11px]" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
                    Last edited {new Date(draft.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link href={`/boost/create?draftId=${draft.id}`}>
                  <motion.span
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{
                      background: 'rgba(245,197,24,0.12)',
                      border: '1px solid rgba(245,197,24,0.30)',
                      color: '#F5C518',
                    }}
                  >
                    <PenLine size={12} /> Continue Editing
                  </motion.span>
                </Link>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Features / Info ───────────────────────────────────────────────── */}
      <div ref={featuresRef}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl p-5 pb-6"
          style={cardStyle}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} style={{ color: '#F5C518' }} />
            <h3
              className="text-base font-bold"
              style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}
            >
              Why Advertise on CookReels?
            </h3>
          </div>
          <p className="text-sm mb-6" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            Everything you need to reach the right audience at the right moment.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-2xl p-4 space-y-3"
                  style={{
                    background: feat.gradient,
                    border: `1px solid ${feat.color}20`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${feat.color}18`, border: `1px solid ${feat.color}30` }}
                  >
                    <Icon size={18} style={{ color: feat.color }} />
                  </div>
                  <div>
                    <h4
                      className="text-sm font-bold mb-1"
                      style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}
                    >
                      {feat.title}
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: isDark ? '#71717A' : '#666' }}>
                      {feat.desc}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Bottom CTA */}
          <div
            className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl p-4"
            style={{
              background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(245,197,24,0.06)',
              border: '1px solid rgba(245,197,24,0.20)',
            }}
          >
            <div>
              <p className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
                Ready to grow your audience?
              </p>
              <p className="text-xs mt-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
                Starting from ₹0.10 per impression. No minimum spend.
              </p>
            </div>
            <Link href="/boost/create">
              <motion.span
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #F5C518, #FFB800)',
                  color: '#1A1A1A',
                  boxShadow: '0 4px 16px rgba(245,197,24,0.35)',
                  fontFamily: 'var(--font-poppins), sans-serif',
                }}
              >
                Start Advertising <ArrowRight size={15} />
              </motion.span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── Why Advertise on CookReels (premium comparison section) ──────── */}
      <WhyAdvertiseCookReels />
    </div>
  )
}
