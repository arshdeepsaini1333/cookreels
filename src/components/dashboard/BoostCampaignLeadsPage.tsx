'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import {
  ArrowLeft, Users, Search, Phone, Mail, CheckCircle2, Clock, XCircle,
  RefreshCw, Filter, Eye, MousePointer, Target, Download, FileSpreadsheet,
  Megaphone, TrendingUp,
} from 'lucide-react'
import { exportSingleLead, exportAllLeads, type ExportableLead } from '@/lib/exportLeadsExcel'

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'DROPPED'
type CampStatus = 'active' | 'pending' | 'draft' | 'paused' | 'completed' | 'rejected'

interface Lead extends ExportableLead {
  status: LeadStatus
}

interface CampaignSummary {
  id: string
  name: string
  status: CampStatus
  platform: string
  totalBudget: number
  dailyBudget: number
  purchasedImpressions: number
  usedImpressions: number
  remainingImpressions: number
  clicks: number
  spend: number
  startDate: string | null
  endDate: string | null
  createdAt: string
}

interface ApiResponse {
  campaign: CampaignSummary
  leads: Lead[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

const CAMP_STATUS_CFG: Record<CampStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:    { label: 'Live',           color: '#7DBB91', bg: 'rgba(125,187,145,0.15)', icon: CheckCircle2 },
  pending:   { label: 'Pending Review', color: '#F5C518', bg: 'rgba(245,197,24,0.15)',  icon: Clock },
  draft:     { label: 'Draft',          color: '#A1A1AA', bg: 'rgba(161,161,170,0.15)', icon: Clock },
  paused:    { label: 'Paused',         color: '#FF9F1C', bg: 'rgba(255,159,28,0.15)',  icon: Clock },
  completed: { label: 'Completed',      color: '#4285F4', bg: 'rgba(66,133,244,0.15)',  icon: CheckCircle2 },
  rejected:  { label: 'Rejected',       color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', icon: XCircle },
}

const LEAD_STATUS_CFG: Record<LeadStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  NEW:       { label: 'New',       color: '#F5C518', bg: 'rgba(245,197,24,0.15)',  icon: Clock },
  CONTACTED: { label: 'Contacted', color: '#4285F4', bg: 'rgba(66,133,244,0.15)',  icon: RefreshCw },
  CONVERTED: { label: 'Converted', color: '#7DBB91', bg: 'rgba(125,187,145,0.15)', icon: CheckCircle2 },
  DROPPED:   { label: 'Dropped',   color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', icon: XCircle },
}

type StatusFilter = 'all' | LeadStatus

const TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'NEW', label: 'New' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'CONVERTED', label: 'Converted' },
  { id: 'DROPPED', label: 'Dropped' },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BoostCampaignLeadsPage({ campaignId }: { campaignId: string }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()

  const [data, setData]       = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState<StatusFilter>('all')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    fetch(`/api/boost/campaigns/${campaignId}/leads`)
      .then(async r => {
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error ?? 'Failed to load') }
        return r.json()
      })
      .then((d: ApiResponse) => { setData(d); setLoading(false) })
      .catch((e: Error) => { setError(e.message); setLoading(false) })
  }, [campaignId])

  const leads = data?.leads ?? []
  const tabFiltered = tab === 'all' ? leads : leads.filter(l => l.status === tab)
  const filtered = search.trim()
    ? tabFiltered.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.mobile.includes(search) ||
        (l.email ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : tabFiltered

  const counts: Record<StatusFilter, number> = {
    all: leads.length,
    NEW: leads.filter(l => l.status === 'NEW').length,
    CONTACTED: leads.filter(l => l.status === 'CONTACTED').length,
    CONVERTED: leads.filter(l => l.status === 'CONVERTED').length,
    DROPPED: leads.filter(l => l.status === 'DROPPED').length,
  }

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
    backdropFilter: 'blur(20px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(52,52,56,0.80)' : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
  }

  const c = data?.campaign
  const cfg = c ? CAMP_STATUS_CFG[c.status] : null
  const StatusIcon = cfg?.icon ?? Clock
  const ctr = c && c.usedImpressions > 0 ? ((c.clicks / c.usedImpressions) * 100).toFixed(2) : '0.00'
  const usedPct = c && c.purchasedImpressions > 0 ? Math.min((c.usedImpressions / c.purchasedImpressions) * 100, 100) : 0

  const statCards = c ? [
    { label: 'Impressions Bought', value: formatNum(c.purchasedImpressions), icon: Target,       color: '#F5C518' },
    { label: 'Impressions Used',   value: formatNum(c.usedImpressions),      icon: Eye,           color: '#4285F4' },
    { label: 'Clicks',             value: formatNum(c.clicks),               icon: MousePointer,  color: '#7DBB91' },
    { label: 'CTR',                value: `${ctr}%`,                          icon: TrendingUp,    color: '#FF9F1C' },
    { label: 'Total Leads',        value: formatNum(leads.length),           icon: Users,         color: '#E1306C' },
  ] : []

  const downloadOne = (lead: Lead) => exportSingleLead(lead, c?.name ?? 'campaign')
  const downloadAll  = () => exportAllLeads(filtered, c?.name ?? 'campaign')

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => router.push('/boost/campaigns')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: isDark ? 'rgba(43,43,45,0.80)' : 'rgba(255,255,255,0.90)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#A1A1AA' : '#666' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,197,24,0.50)'; e.currentTarget.style.color = '#F5C518' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? '#343438' : '#E8E8E8'; e.currentTarget.style.color = isDark ? '#A1A1AA' : '#666' }}>
            <ArrowLeft size={13} /> Back to Campaigns
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(125,187,145,0.15)', border: '1px solid rgba(125,187,145,0.30)' }}>
                <Megaphone size={14} style={{ color: '#7DBB91' }} />
              </div>
              <h1 className="text-xl font-bold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
                {loading ? 'Loading…' : (c?.name ?? 'Campaign')}
              </h1>
              {cfg && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ background: cfg.bg, color: cfg.color }}>
                  <StatusIcon size={10} strokeWidth={2.5} /> {cfg.label}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5 ml-9" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
              Leads, impressions &amp; clicks for this campaign
            </p>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-xl p-4 text-sm font-medium" style={{ background: 'rgba(255,107,107,0.10)', border: '1px solid rgba(255,107,107,0.30)', color: '#FF6B6B' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(loading ? Array.from({ length: 5 }) : statCards).map((s, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}
            className="rounded-2xl p-3.5" style={cardStyle}>
            {loading || !s ? (
              <>
                <div className="w-8 h-8 rounded-xl mb-2.5" style={{ background: isDark ? 'rgba(52,52,56,0.5)' : '#F0F0F0' }} />
                <div className="h-6 w-14 rounded-lg" style={{ background: isDark ? 'rgba(52,52,56,0.5)' : '#F0F0F0' }} />
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                  style={{ background: `${(s as typeof statCards[number]).color}15`, border: `1px solid ${(s as typeof statCards[number]).color}25` }}>
                  {(() => { const Icon = (s as typeof statCards[number]).icon; return <Icon size={15} style={{ color: (s as typeof statCards[number]).color }} /> })()}
                </div>
                <p className="text-xl font-bold leading-none" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>{(s as typeof statCards[number]).value}</p>
                <p className="text-[10px] mt-1 font-semibold" style={{ color: isDark ? '#52525B' : '#A1A1AA' }}>{(s as typeof statCards[number]).label}</p>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Impressions used progress */}
      {!loading && c && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl p-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>Impressions Bought vs Used</p>
            <p className="text-xs font-semibold" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
              {formatNum(c.usedImpressions)} / {formatNum(c.purchasedImpressions)} ({usedPct.toFixed(1)}%)
            </p>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: isDark ? '#343438' : '#F0F0F0' }}>
            <div className="h-full rounded-full" style={{ width: `${usedPct}%`, background: 'linear-gradient(90deg, #F5C518, #FFB800)' }} />
          </div>
          <p className="text-[11px] mt-2" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            {formatNum(c.remainingImpressions)} impressions remaining · Spend so far {formatINR(c.spend)} of {formatINR(c.totalBudget)} budget
          </p>
        </motion.div>
      )}

      {/* Leads table card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl overflow-hidden" style={cardStyle}>

        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-4 flex-wrap" style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
            <input
              className="w-full rounded-xl pl-8 pr-3.5 py-2 text-sm outline-none"
              placeholder="Search by name, phone, or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#F5F5F5' : '#1A1A1A' }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            <Filter size={13} /> {filtered.length} leads
          </div>

          {/* Download actions */}
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={downloadAll} disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 4px 14px rgba(245,197,24,0.35)' }}>
              <Download size={13} /> Download All
            </motion.button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2.5 flex gap-1 overflow-x-auto" style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1.5"
              style={tab === t.id ? { background: 'rgba(125,187,145,0.15)', border: '1px solid rgba(125,187,145,0.40)', color: '#7DBB91' } : { color: isDark ? '#71717A' : '#9CA3AF', border: '1px solid transparent' }}>
              {t.label}
              <span className="px-1.5 py-0.5 rounded-full text-[9px]" style={{ background: isDark ? '#343438' : '#F0F0F0', color: isDark ? '#A1A1AA' : '#666' }}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-xl" style={{ background: isDark ? 'rgba(52,52,56,0.4)' : 'rgba(0,0,0,0.04)' }} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
                  {['Name', 'Mobile', 'Email', 'Status', 'Notes', 'Date', ''].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const lcfg = LEAD_STATUS_CFG[lead.status]
                  const LIcon = lcfg.icon
                  return (
                    <tr key={lead.id} className="transition-colors"
                      style={{ borderBottom: `1px solid ${isDark ? '#28282B' : '#F5F5F5'}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.30)' : 'rgba(245,197,24,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="py-2.5 px-3 text-sm font-semibold whitespace-nowrap" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{lead.name}</td>
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
                        <span className="inline-flex items-center gap-1.5"><Phone size={11} style={{ color: '#7DBB91' }} />{lead.mobile}</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
                        {lead.email ? <span className="inline-flex items-center gap-1.5"><Mail size={11} style={{ color: '#4285F4' }} />{lead.email}</span> : '—'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: lcfg.bg, color: lcfg.color }}>
                          <LIcon size={9} strokeWidth={2.5} /> {lcfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs max-w-[200px] truncate" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{lead.notes ?? '—'}</td>
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button onClick={() => downloadOne(lead)}
                          title="Download this lead"
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ color: isDark ? '#71717A' : '#9CA3AF' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,197,24,0.12)'; e.currentTarget.style.color = '#F5C518' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isDark ? '#71717A' : '#9CA3AF' }}>
                          <FileSpreadsheet size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(125,187,145,0.10)', border: '1.5px dashed rgba(125,187,145,0.35)' }}>
                <Users size={26} style={{ color: 'rgba(125,187,145,0.55)' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>No leads yet</p>
              <p className="text-xs mt-1 text-center max-w-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
                Leads collected for this campaign will show up here.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

