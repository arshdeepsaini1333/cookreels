import { Lock } from 'lucide-react'

export function Forbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-24 text-center"
      style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
      >
        <Lock size={22} strokeWidth={1.8} />
      </div>
      <p className="text-sm font-semibold text-[var(--cr-text-1)]">Access restricted</p>
      <p className="max-w-sm text-sm text-[var(--cr-text-2)]">
        This module is restricted to a specific administrator account. You don&apos;t have permission to view it.
      </p>
    </div>
  )
}
