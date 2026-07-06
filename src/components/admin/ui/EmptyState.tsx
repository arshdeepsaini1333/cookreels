import { Construction, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  message?: string
  icon?: LucideIcon
}

export function EmptyState({
  title = 'Coming soon',
  message = 'This module is scaffolded and ready — functionality will be implemented here.',
  icon: Icon = Construction,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-24 text-center"
      style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)' }}
      >
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <p className="text-sm font-semibold text-[var(--cr-text-1)]">{title}</p>
      <p className="max-w-sm text-sm text-[var(--cr-text-2)]">{message}</p>
    </div>
  )
}
