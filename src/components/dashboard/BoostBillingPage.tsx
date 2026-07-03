'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import {
  ArrowLeft, DollarSign, Plus, CreditCard, CheckCircle2, Clock,
  XCircle, RefreshCw, Receipt, TrendingUp, Megaphone,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

interface Payment {
  id: string
  amount: string
  currency: string
  status: PaymentStatus
  paymentMethod: string | null
  razorpayPaymentId: string | null
  createdAt: string
  campaign: { id: string; name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PaymentStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  CREATED:  { label: 'Created',  color: '#A1A1AA', bg: 'rgba(161,161,170,0.15)', icon: Clock },
  PENDING:  { label: 'Pending',  color: '#F5C518', bg: 'rgba(245,197,24,0.15)',  icon: Clock },
  SUCCESS:  { label: 'Paid',     color: '#7DBB91', bg: 'rgba(125,187,145,0.15)', icon: CheckCircle2 },
  FAILED:   { label: 'Failed',   color: '#FF6B6B', bg: 'rgba(255,107,107,0.15)', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: '#4285F4', bg: 'rgba(66,133,244,0.15)',  icon: RefreshCw },
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

function PaymentRow({ payment, isDark }: { payment: Payment; isDark: boolean }) {
  const cfg = STATUS_CFG[payment.status]
  const StatusIcon = cfg.icon
  const amount = Number(payment.amount)

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors"
      style={{ border: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}
      onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(52,52,56,0.35)' : 'rgba(245,197,24,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: cfg.bg, border: `1px solid ${cfg.color}28` }}>
        <StatusIcon size={15} style={{ color: cfg.color }} strokeWidth={2} />
      </div>

      {/* Campaign name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
          {payment.campaign?.name ?? 'Campaign (deleted)'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px]" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{fmtDate(payment.createdAt)}</p>
          {payment.razorpayPaymentId && (
            <p className="text-[10px] font-mono truncate max-w-[120px]" style={{ color: isDark ? '#52525B' : '#D1D5DB' }}>
              {payment.razorpayPaymentId}
            </p>
          )}
        </div>
      </div>

      {/* Method */}
      {payment.paymentMethod && (
        <span className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium flex-shrink-0"
          style={{ background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(245,245,245,0.80)', border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`, color: isDark ? '#A1A1AA' : '#666' }}>
          <CreditCard size={11} />{payment.paymentMethod}
        </span>
      )}

      {/* Status */}
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
        style={{ background: cfg.bg, color: cfg.color }}>
        <StatusIcon size={10} strokeWidth={2.5} />{cfg.label}
      </span>

      {/* Amount */}
      <p className="text-sm font-bold flex-shrink-0" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
        {fmtINR(amount)}
      </p>
    </motion.div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(255,159,28,0.10)', border: '1.5px dashed rgba(255,159,28,0.35)' }}>
        <Receipt size={32} style={{ color: 'rgba(255,159,28,0.55)' }} />
      </div>
      <h4 className="text-base font-bold mb-1.5"
        style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
        No billing history yet
      </h4>
      <p className="text-sm text-center mb-3 max-w-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        Your payment history will appear here once you fund and launch your first campaign.
      </p>
      <p className="text-xs text-center mb-6 max-w-xs" style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>
        All payments are processed securely via Razorpay. No minimum spend required.
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

export default function BoostBillingPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()

  const [payments, setPayments] = useState<Payment[]>([])
  const [totalSpend, setTotalSpend] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all')

  useEffect(() => {
    fetch('/api/boost/billing')
      .then(r => r.json())
      .then((d: { payments: Payment[]; totalSpend: number }) => {
        setPayments(d.payments ?? [])
        setTotalSpend(d.totalSpend ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
    backdropFilter: 'blur(20px)',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(52,52,56,0.80)' : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
  }

  const successPayments = payments.filter(p => p.status === 'SUCCESS')
  const pendingPayments = payments.filter(p => p.status === 'PENDING' || p.status === 'CREATED')

  const filtered = statusFilter === 'all' ? payments : payments.filter(p => p.status === statusFilter)

  const STATUS_TABS: { id: 'all' | PaymentStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'SUCCESS', label: 'Paid' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'FAILED', label: 'Failed' },
    { id: 'REFUNDED', label: 'Refunded' },
  ]

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
                style={{ background: 'rgba(255,159,28,0.15)', border: '1px solid rgba(255,159,28,0.30)' }}>
                <DollarSign size={14} style={{ color: '#FF9F1C' }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
                Billing
              </h1>
            </div>
            <p className="text-xs mt-0.5 ml-9" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
              Payment history and invoices for your campaigns
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Total Spend',
            value: loading ? '…' : fmtINR(totalSpend),
            icon: TrendingUp,
            color: '#7DBB91',
            sub: `${successPayments.length} successful payment${successPayments.length !== 1 ? 's' : ''}`,
          },
          {
            label: 'Pending',
            value: loading ? '…' : fmtINR(pendingPayments.reduce((s, p) => s + Number(p.amount), 0)),
            icon: Clock,
            color: '#F5C518',
            sub: `${pendingPayments.length} awaiting`,
          },
          {
            label: 'Total Transactions',
            value: loading ? '…' : String(payments.length),
            icon: Receipt,
            color: '#FF9F1C',
            sub: 'across all campaigns',
          },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.06 }}
              className="rounded-2xl p-4" style={cardStyle}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                  <Icon size={16} style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>{s.value}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>{s.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#52525B' : '#D1D5DB' }}>{s.sub}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Payment history card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl overflow-hidden" style={cardStyle}>

        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,159,28,0.15)', border: '1px solid rgba(255,159,28,0.25)' }}>
              <Megaphone size={14} style={{ color: '#FF9F1C' }} />
            </div>
            <h3 className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A', fontFamily: 'var(--font-poppins), sans-serif' }}>
              Payment History
            </h3>
          </div>
          <span className="text-xs" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Status tabs */}
        <div className="px-5 py-2.5 flex gap-1 overflow-x-auto"
          style={{ borderBottom: `1px solid ${isDark ? '#343438' : '#F0F0F0'}` }}>
          {STATUS_TABS.map(t => (
            <button key={t.id} onClick={() => setStatusFilter(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1.5"
              style={statusFilter === t.id ? {
                background: 'rgba(255,159,28,0.15)',
                border: '1px solid rgba(255,159,28,0.40)',
                color: '#FF9F1C',
              } : {
                color: isDark ? '#71717A' : '#9CA3AF',
                border: '1px solid transparent',
              }}>
              {t.label}
              {t.id !== 'all' && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px]"
                  style={{ background: isDark ? '#343438' : '#F0F0F0', color: isDark ? '#A1A1AA' : '#666' }}>
                  {payments.filter(p => p.status === t.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="p-4">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-16 rounded-xl" style={{ background: isDark ? 'rgba(52,52,56,0.4)' : 'rgba(0,0,0,0.04)' }} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-1.5">
              {filtered.map(p => <PaymentRow key={p.id} payment={p} isDark={isDark} />)}
            </div>
          ) : (
            <EmptyState isDark={isDark} />
          )}
        </div>

        {/* Footer note */}
        {payments.length > 0 && (
          <div className="px-5 py-3 flex items-center gap-2 text-xs"
            style={{ borderTop: `1px solid ${isDark ? '#343438' : '#F0F0F0'}`, color: isDark ? '#52525B' : '#D1D5DB' }}>
            <CreditCard size={12} />
            All payments processed securely via Razorpay · GST may apply
          </div>
        )}
      </motion.div>
    </div>
  )
}
