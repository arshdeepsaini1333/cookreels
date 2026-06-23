'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import {
  ArrowLeft, BarChart2, Eye, MousePointer, DollarSign, Target,
  TrendingUp, Megaphone, Plus, Zap, ArrowRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface BoostStats {
  activeCampaigns: number
  draftCampaigns: number
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  totalLeads: number
  campaigns: Campaign[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtINR(n: number): string {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`
  return `₹${n.toFixed(0)}`
}

const PLATFORM_COLORS: Record<string, string> = {
  cookreels: '#F5C518', meta: '#E1306C', google: '#4285F4', geofencing: '#7DBB91',
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(161,161,170,0.15)' }}>
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: color }}
      />
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, sub, isDark }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string; isDark: boolean
}) {
  return (
    <div className="rounded-2xl p-4"
      style={{
        background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        backdropFilter: 'blur(20px)',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <p className="text-2xl font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>{value}</p>
      <p className="text-xs font-semibold mt-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{label}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#52525B' : '#D1D5DB' }}>{sub}</p>}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(66,133,244,0.10)', border: '1.5px dashed rgba(66,133,244,0.35)' }}>
        <BarChart2 size={32} style={{ color: 'rgba(66,133,244,0.55)' }} />
      </div>
      <h4 className="text-base font-bold mb-1.5"
        style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
        No analytics data yet
      </h4>
      <p className="text-sm text-center mb-6 max-w-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        Launch your first campaign to start seeing impressions, clicks, and performance data here.
      </p>
      <Link href="/boost/create">
        <motion.span whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 4px 16px rgba(245,197,24,0.35)' }}>
          <Plus size={15} /> Launch Your First Campaign
        </motion.span>
      </Link>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BoostAnalyticsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()

  const [stats, setStats] = useState<BoostStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/boost/stats')
      .then(r => r.json())
      .then((d: BoostStats) => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
    backdropFilter: 'blur(20px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(52,52,56,0.80)' : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
  }

  const campaigns = (stats?.campaigns ?? []).filter(c => c.impressions > 0 || c.clicks > 0)
  const hasData = !loading && campaigns.length > 0

  const maxImpressions = Math.max(...campaigns.map(c => c.impressions), 1)
  const maxClicks = Math.max(...campaigns.map(c => c.clicks), 1)
  const maxBudget = Math.max(...campaigns.map(c => c.budget), 1)

  const avgCTR = stats && stats.totalImpressions > 0
    ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2)
    : '0.00'

  const cpm = stats && stats.totalImpressions > 0
    ? fmtINR((stats.totalSpend / stats.totalImpressions) * 1000)
    : '₹0'

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.push('/boost')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: isDark ? 'rgba(43,43,45,0.80)' : 'rgba(255,255,255,0.90)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#A1A1AA' : '#666' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.50)'; e.currentTarget.style.color = '#F5C518' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? '#343438' : '#E8E8E8'; e.currentTarget.style.color = isDark ? '#A1A1AA' : '#666' }}>
            <ArrowLeft size={13} /> Back to Boost
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.30)' }}>
                <TrendingUp size={14} style={{ color: '#4285F4' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
                Analytics
              </h1>
            </div>
            <p className="text-xs mt-0.5 ml-9" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
              Performance breakdown across all your campaigns
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

      {/* Overview stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Active Campaigns', value: String(stats?.activeCampaigns ?? 0), icon: Zap, color: '#F5C518', sub: undefined },
          { label: 'Total Impressions', value: fmtNum(stats?.totalImpressions ?? 0), icon: Eye, color: '#4285F4', sub: undefined },
          { label: 'Total Clicks', value: fmtNum(stats?.totalClicks ?? 0), icon: MousePointer, color: '#7DBB91', sub: undefined },
          { label: 'Avg. CTR', value: `${avgCTR}%`, icon: TrendingUp, color: '#FF9F1C', sub: 'click-through rate' },
          { label: 'Total Spend', value: fmtINR(stats?.totalSpend ?? 0), icon: DollarSign, color: '#E1306C', sub: undefined },
          { label: 'CPM', value: cpm, icon: Target, color: '#A855F7', sub: 'per 1K impressions' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
            {loading ? (
              <div className="rounded-2xl p-4 h-24" style={{ background: isDark ? 'rgba(43,43,45,0.40)' : 'rgba(255,255,255,0.60)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}` }} />
            ) : (
              <StatCard {...s} isDark={isDark} />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Campaign breakdown */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl overflow-hidden" style={cardStyle}>

        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.25)' }}>
              <BarChart2 size={14} style={{ color: '#4285F4' }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
              Per-Campaign Performance
            </h3>
          </div>
          <span className="text-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} with data
          </span>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-20 rounded-xl" style={{ background: isDark ? 'rgba(52,52,56,0.4)' : 'rgba(0,0,0,0.04)' }} />
              ))}
            </div>
          ) : hasData ? (
            <div className="space-y-3">
              {campaigns.map((c, i) => {
                const pColor = PLATFORM_COLORS[c.platform] ?? '#F5C518'
                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00'
                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="rounded-xl p-4 space-y-3"
                    style={{ background: isDark ? 'rgba(30,30,31,0.50)' : 'rgba(248,248,248,0.70)', border: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: pColor }} />
                        <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{c.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize"
                          style={{ background: `${pColor}18`, color: pColor, border: `1px solid ${pColor}28` }}>
                          {c.platform}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs flex-shrink-0 ml-3">
                        <div className="text-right">
                          <p className="font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{fmtNum(c.impressions)}</p>
                          <p style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>Impr.</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{fmtNum(c.clicks)}</p>
                          <p style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>Clicks</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{ctr}%</p>
                          <p style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>CTR</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{fmtINR(c.budget)}</p>
                          <p style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>Budget</p>
                        </div>
                      </div>
                    </div>

                    {/* Bars */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] w-12 text-right flex-shrink-0" style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>Impr.</span>
                        <div className="flex-1"><MiniBar value={c.impressions} max={maxImpressions} color="#4285F4" /></div>
                        <span className="text-[10px] w-10 flex-shrink-0" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{fmtNum(c.impressions)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] w-12 text-right flex-shrink-0" style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>Clicks</span>
                        <div className="flex-1"><MiniBar value={c.clicks} max={maxClicks} color="#7DBB91" /></div>
                        <span className="text-[10px] w-10 flex-shrink-0" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{fmtNum(c.clicks)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] w-12 text-right flex-shrink-0" style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>Budget</span>
                        <div className="flex-1"><MiniBar value={c.budget} max={maxBudget} color="#F5C518" /></div>
                        <span className="text-[10px] w-10 flex-shrink-0" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{fmtINR(c.budget)}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <EmptyState isDark={isDark} />
          )}
        </div>
      </motion.div>

      {/* CTA if has some campaigns but no analytics data */}
      {!loading && (stats?.campaigns ?? []).length > 0 && campaigns.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ ...cardStyle, background: isDark ? 'rgba(66,133,244,0.06)' : 'rgba(66,133,244,0.03)', border: '1px solid rgba(66,133,244,0.20)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.25)' }}>
              <Megaphone size={18} style={{ color: '#4285F4' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>Your campaigns are being set up</p>
              <p className="text-xs mt-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Analytics data will appear once your campaigns go live and start delivering.</p>
            </div>
          </div>
          <Link href="/boost/campaigns">
            <motion.span whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap flex-shrink-0"
              style={{ background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.30)', color: '#4285F4' }}>
              View Campaigns <ArrowRight size={13} />
            </motion.span>
          </Link>
        </motion.div>
      )}
    </div>
  )
}
