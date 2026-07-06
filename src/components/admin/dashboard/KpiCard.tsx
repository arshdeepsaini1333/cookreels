import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  icon: LucideIcon
}

export function KpiCard({ label, value, icon: Icon }: KpiCardProps) {
  return (
    <div
      className="rounded-2xl border p-5 shadow-premium"
      style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-heading font-bold text-[var(--cr-text-1)]">{value}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)' }}
        >
          <Icon size={18} strokeWidth={1.9} />
        </div>
      </div>
    </div>
  )
}
