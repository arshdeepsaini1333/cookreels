'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import {
  ArrowLeft, Users, Plus, Search, Phone, Mail, Megaphone,
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
  const [campaignFilter, setCampaignFilter] = useState('all')

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

  const campaigns = Array.from(new Map(leads.map(l => [l.campaign.id, l.campaign])).values())
    .sort((a, b) => a.name.localeCompare(b.name))

  const tabFiltered = tab === 'all' ? leads : leads.filter(l => l.status === tab)
  const campaignFiltered = campaignFilter === 'all' ? tabFiltered : tabFiltered.filter(l => l.campaign.id === campaignFilter)
  const filtered = search.trim()
    ? campaignFiltered.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.mobile.includes(search) ||
        (l.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        l.campaign.name.toLowerCase().includes(search.toLowerCase())
      )
    : campaignFiltered

  const counts: Record<StatusFilter, number> = {
    all: leads.length,
    NEW: leads.filter(l => l.status === 'NEW').length,
    CONTACTED: leads.filter(l => l.status === 'CONTACTED').length,
    CONVERTED: leads.filter(l => l.status === 'CONVERTED').length,
    DROPPED: leads.filter(l => l.status === 'DROPPED').length,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-10">

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
        <div className="flex items-center gap-3 px-5 py-4 flex-wrap"
          style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          <div className="relative flex-1 min-w-[180px]">
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
          <select
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
            className="rounded-xl px-3 py-2 text-xs font-semibold outline-none max-w-[200px]"
            style={{
              background: isDark ? 'rgba(30,30,31,0.80)' : 'rgba(245,245,245,0.80)',
              border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
              color: isDark ? '#F5F5F5' : '#1A1A1A',
            }}
          >
            <option value="all">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
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

        {/* Table */}
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-xl" style={{ background: isDark ? 'rgba(52,52,56,0.4)' : 'rgba(0,0,0,0.04)' }} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <table className="w-full border-collapse min-w-[760px]">
              <thead>
                <tr style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
                  {['Name', 'Mobile', 'Email', 'Campaign', 'Status', 'Notes', 'Date'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const cfg = STATUS_CFG[lead.status]
                  const StatusIcon = cfg.icon
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
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                        <Link href={`/boost/campaigns/${lead.campaign.id}/leads`}
                          className="inline-flex items-center gap-1.5 font-semibold hover:underline"
                          style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
                          <Megaphone size={11} style={{ color: '#F5C518' }} />
                          <span className="max-w-[160px] truncate">{lead.campaign.name}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                          <StatusIcon size={9} strokeWidth={2.5} /> {cfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs max-w-[200px] truncate" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{lead.notes ?? '—'}</td>
                      <td className="py-2.5 px-3 text-xs whitespace-nowrap" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState isDark={isDark} filtered={search.trim().length > 0 || tab !== 'all' || campaignFilter !== 'all'} />
          )}
        </div>
      </motion.div>
    </div>
  )
}
