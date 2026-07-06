'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MoreHorizontal, Eye, PenLine, Zap, Pause, Play, XCircle, Ban, CheckCircle2, Trash2, UserPlus, BarChart3,
} from 'lucide-react'
import type { CampaignStatus } from '@/generated/prisma'
import { AddLeadDialog } from '@/components/admin/campaigns/AddLeadModal'
import { AddStatsDialog } from '@/components/admin/campaigns/AddStatsModal'

export type StatusAction = 'approve' | 'reject' | 'pause' | 'resume' | 'complete' | 'cancel'

export const ACTIONS_BY_STATUS: Record<CampaignStatus, { action: StatusAction; label: string; icon: React.ElementType; danger?: boolean }[]> = {
  DRAFT:           [{ action: 'approve', label: 'Make Live', icon: Zap }, { action: 'reject', label: 'Reject', icon: XCircle, danger: true }],
  PENDING_PAYMENT: [{ action: 'approve', label: 'Make Live', icon: Zap }, { action: 'reject', label: 'Reject', icon: XCircle, danger: true }],
  ACTIVE:          [{ action: 'pause', label: 'Pause', icon: Pause }, { action: 'complete', label: 'Mark Completed', icon: CheckCircle2 }],
  PAUSED:          [{ action: 'resume', label: 'Resume', icon: Play }, { action: 'complete', label: 'Mark Completed', icon: CheckCircle2 }],
  REJECTED:        [{ action: 'approve', label: 'Make Live', icon: Zap }],
  COMPLETED:       [],
  CANCELLED:       [],
}

const MENU_WIDTH = 176 // w-44

export function CampaignActionsMenu({ id, status }: { id: string; status: CampaignStatus }) {
  const router = useRouter()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [addLeadOpen, setAddLeadOpen] = useState(false)
  const [addStatsOpen, setAddStatsOpen] = useState(false)

  // The menu is portaled to <body> so it can't be clipped by an ancestor's
  // overflow (e.g. the table wrapper's overflow-x-auto also clips overflow-y).
  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition({ top: rect.bottom + 4, left: rect.right - MENU_WIDTH })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  async function runAction(action: StatusAction) {
    setOpen(false)
    setBusy(true)
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
      setBusy(false)
    }
  }

  async function runDelete() {
    setOpen(false)
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        alert(body.error ?? 'Failed to delete campaign')
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const statusActions = ACTIONS_BY_STATUS[status]
  const canCancel = status !== 'COMPLETED' && status !== 'CANCELLED'

  return (
    <div className="inline-block" style={{ opacity: busy ? 0.5 : 1, pointerEvents: busy ? 'none' : 'auto' }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--cr-accent-soft)]"
        style={{ color: 'var(--cr-text-muted)' }}
        aria-label="Campaign actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && position && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 overflow-hidden rounded-xl py-1 shadow-2xl"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH, background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)' }}
          >
            <Link
              href={`/admin/campaigns/${id}`}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)]"
              onClick={() => setOpen(false)}
            >
              <Eye size={14} /> View
            </Link>
            <Link
              href={`/admin/campaigns/${id}?edit=1`}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)]"
              onClick={() => setOpen(false)}
            >
              <PenLine size={14} /> Edit
            </Link>
            <button
              onClick={() => { setOpen(false); setAddLeadOpen(true) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)]"
            >
              <UserPlus size={14} /> Add Lead
            </button>
            <button
              onClick={() => { setOpen(false); setAddStatsOpen(true) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)]"
            >
              <BarChart3 size={14} /> Add Stats
            </button>
            {statusActions.map(a => (
              <button
                key={a.action}
                onClick={() => runAction(a.action)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--cr-accent-soft)]"
                style={{ color: a.danger ? '#EF4444' : 'var(--cr-text-2)' }}
              >
                <a.icon size={14} /> {a.label}
              </button>
            ))}
            {canCancel && (
              <button
                onClick={() => runAction('cancel')}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)]"
              >
                <Ban size={14} /> Cancel
              </button>
            )}
            <button
              onClick={runDelete}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--cr-accent-soft)]"
              style={{ color: '#EF4444' }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>,
        document.body,
      )}

      <AddLeadDialog campaignId={id} open={addLeadOpen} onClose={() => setAddLeadOpen(false)} />
      <AddStatsDialog campaignId={id} open={addStatsOpen} onClose={() => setAddStatsOpen(false)} />
    </div>
  )
}
