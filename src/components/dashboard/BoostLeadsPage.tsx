'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import {
  ArrowLeft, Users, Plus, Search, Phone, Mail, MessageSquare,
  CheckCircle2, Clock, XCircle, RefreshCw, Filter,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'DROPPED'

interface Lead {
  id: string
  name: string
  mobile: string
  email: string | null
  notes: string | null
  status: LeadStatus
  createdAt: string
  campaign: { id: string; name: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<LeadStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
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

// ─── Lead Row ─────────────────────────────────────────────────────────────────

function LeadRow({ lead, isDark }: { lead: Lead; isDark: boolean }) {
  const cfg = STATUS_CFG[lead.status]
  const StatusIcon = cfg.icon
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden transition-colors"
      style={{ border: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}
    >
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.35)' : 'rgba(245,197,24,0.03)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}28` }}>
          {lead.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{lead.name}</p>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            {lead.campaign.name}
          </p>
        </div>

        {/* Status */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
          style={{ background: cfg.bg, color: cfg.color }}>
          <StatusIcon size={10} strokeWidth={2.5} /> {cfg.label}
        </span>

        {/* Date */}
        <p className="text-xs flex-shrink-0 hidden md:block" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
          {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden', borderTop: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}
          >
            <div className="px-5 py-3.5 flex flex-wrap gap-4"
              style={{ background: isDark ? 'rgba(30,30,31,0.50)' : 'rgba(248,248,248,0.60)' }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
                <Phone size={12} style={{ color: '#7DBB91' }} />
                <span className="font-medium">{lead.mobile}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-xs" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
                  <Mail size={12} style={{ color: '#4285F4' }} />
                  <span className="font-medium">{lead.email}</span>
                </div>
              )}
              {lead.notes && (
                <div className="flex items-start gap-2 text-xs" style={{ color: isDark ? '#A1A1AA' : '#666' }}>
                  <MessageSquare size={12} style={{ color: '#FF9F1C', marginTop: 1 }} />
                  <span>{lead.notes}</span>
                </div>
              )}
              <div className="text-xs" style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>
                Added {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isDark, filtered }: { isDark: boolean; filtered: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(125,187,145,0.10)', border: '1.5px dashed rgba(125,187,145,0.35)' }}>
        <Users size={32} style={{ color: 'rgba(125,187,145,0.55)' }} />
      </div>
      <h4 className="text-base font-bold mb-1.5"
        style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
        {filtered ? 'No matching leads' : 'No leads yet'}
      </h4>
      <p className="text-sm text-center mb-6 max-w-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        {filtered
          ? 'Try adjusting your filter or search to find what you need.'
          : 'When users express interest in your campaigns, their contact details will appear here.'}
      </p>
      {!filtered && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-center max-w-xs" style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>
            Leads are collected when you run campaigns with lead-generation objectives.
          </p>
          <Link href="/boost/create">
            <motion.span whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 4px 16px rgba(245,197,24,0.35)' }}>
              <Plus size={15} /> Create a Campaign
            </motion.span>
          </Link>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function BoostLeadsPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/boost/leads')
      .then(r => r.json())
      .then((d: { leads: Lead[] }) => { setLeads(d.leads ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
    backdropFilter: 'blur(20px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(52,52,56,0.80)' : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
  }

  const tabFiltered = tab === 'all' ? leads : leads.filter(l => l.status === tab)
  const filtered = search.trim()
    ? tabFiltered.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.mobile.includes(search) ||
        (l.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        l.campaign.name.toLowerCase().includes(search.toLowerCase())
      )
    : tabFiltered

  const counts: Record<StatusFilter, number> = {
    all: leads.length,
    NEW: leads.filter(l => l.status === 'NEW').length,
    CONTACTED: leads.filter(l => l.status === 'CONTACTED').length,
    CONVERTED: leads.filter(l => l.status === 'CONVERTED').length,
    DROPPED: leads.filter(l => l.status === 'DROPPED').length,
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
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
                style={{ background: 'rgba(125,187,145,0.15)', border: '1px solid rgba(125,187,145,0.30)' }}>
                <Users size={14} style={{ color: '#7DBB91' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
                Leads
              </h1>
            </div>
            <p className="text-xs mt-0.5 ml-9" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
              Contact details collected from your campaigns
            </p>
          </div>

          {/* Summary chips */}
          <div className="ml-auto flex items-center gap-2">
            {(['CONVERTED', 'NEW'] as const).map(s => (
              <div key={s} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: STATUS_CFG[s].bg, color: STATUS_CFG[s].color, border: `1px solid ${STATUS_CFG[s].color}30` }}>
                {counts[s]} {STATUS_CFG[s].label}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Leads card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl overflow-hidden" style={cardStyle}>

        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
            <input
              className="w-full rounded-xl pl-8 pr-3.5 py-2 text-sm outline-none"
              placeholder="Search by name, phone, or campaign…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)',
                border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                color: isDark ? '#F5F5F5' : '#1A1A1A',
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            <Filter size={13} /> {filtered.length} leads
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 py-2.5 flex gap-1 overflow-x-auto"
          style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1.5"
              style={tab === t.id ? {
                background: 'rgba(125,187,145,0.15)',
                border: '1px solid rgba(125,187,145,0.40)',
                color: '#7DBB91',
              } : {
                color: isDark ? '#71717A' : '#9CA3AF',
                border: '1px solid transparent',
              }}>
              {t.label}
              <span className="px-1.5 py-0.5 rounded-full text-[9px]"
                style={{ background: isDark ? '#343438' : '#F0F0F0', color: isDark ? '#A1A1AA' : '#666' }}>
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-xl" style={{ background: isDark ? 'rgba(52,52,56,0.4)' : 'rgba(0,0,0,0.04)' }} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-1.5">
              {filtered.map(lead => <LeadRow key={lead.id} lead={lead} isDark={isDark} />)}
            </div>
          ) : (
            <EmptyState isDark={isDark} filtered={search.trim().length > 0 || tab !== 'all'} />
          )}
        </div>
      </motion.div>
    </div>
  )
}
