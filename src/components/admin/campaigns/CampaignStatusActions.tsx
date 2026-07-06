'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Trash2, Loader2 } from 'lucide-react'
import type { CampaignStatus } from '@/generated/prisma'
import { ACTIONS_BY_STATUS, type StatusAction } from '@/components/admin/campaigns/CampaignActionsMenu'

export function CampaignStatusActions({ id, status }: { id: string; status: CampaignStatus }) {
  const router = useRouter()
  const [busy, setBusy] = useState<StatusAction | 'delete' | null>(null)

  async function runAction(action: StatusAction) {
    setBusy(action)
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        alert(body.error ?? 'Failed to update campaign status')
      }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function runDelete() {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    setBusy('delete')
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        alert(body.error ?? 'Failed to delete campaign')
        setBusy(null)
        return
      }
      router.push('/admin/campaigns')
    } catch {
      setBusy(null)
    }
  }

  const statusActions = ACTIONS_BY_STATUS[status]
  const canCancel = status !== 'COMPLETED' && status !== 'CANCELLED'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {statusActions.map(a => (
        <button
          key={a.action}
          onClick={() => runAction(a.action)}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={a.danger
            ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }
            : { background: 'linear-gradient(135deg, var(--cr-accent) 0%, var(--cr-accent-2) 100%)', color: 'var(--cr-btn-text)' }}
        >
          {busy === a.action ? <Loader2 size={14} className="animate-spin" /> : <a.icon size={14} />}
          {a.label}
        </button>
      ))}
      {canCancel && (
        <button
          onClick={() => runAction('cancel')}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
          style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-2)' }}
        >
          {busy === 'cancel' ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
          Cancel
        </button>
      )}
      <button
        onClick={runDelete}
        disabled={busy !== null}
        className="ml-auto flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
      >
        {busy === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        Delete
      </button>
    </div>
  )
}
