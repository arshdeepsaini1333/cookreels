import type { CampaignStatus } from '@/generated/prisma'
import { FileText, Clock, Zap, Pause, CheckCircle2, XCircle, Ban } from 'lucide-react'

const STATUS_CFG: Record<CampaignStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  DRAFT:           { label: 'Draft',           color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', icon: FileText },
  PENDING_PAYMENT: { label: 'Pending Payment', color: '#F5C518', bg: 'rgba(245,197,24,0.15)',  icon: Clock },
  ACTIVE:          { label: 'Live',            color: '#22C55E', bg: 'rgba(34,197,94,0.15)',   icon: Zap },
  PAUSED:          { label: 'Paused',          color: '#FF9F1C', bg: 'rgba(255,159,28,0.15)',  icon: Pause },
  COMPLETED:       { label: 'Completed',       color: '#4285F4', bg: 'rgba(66,133,244,0.15)',  icon: CheckCircle2 },
  CANCELLED:       { label: 'Cancelled',       color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', icon: Ban },
  REJECTED:        { label: 'Rejected',        color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   icon: XCircle },
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = STATUS_CFG[status]
  const Icon = cfg.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={12} strokeWidth={2.2} />
      {cfg.label}
    </span>
  )
}
