'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { BarChart3, X, Loader2, AlertCircle } from 'lucide-react'

const inputClass = 'w-full rounded-xl py-2.5 px-3.5 text-sm outline-none transition-colors focus:border-[var(--cr-accent)]'
const inputStyle = { background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)' }
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]'

interface AddStatsDialogProps {
  campaignId: string
  open: boolean
  onClose: () => void
}

// Controlled dialog with no trigger of its own — lets both the detail page
// button and the campaigns-list row menu drive the same form.
export function AddStatsDialog({ campaignId, open, onClose }: AddStatsDialogProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [impressions, setImpressions] = useState('')
  const [clicks, setClicks] = useState('')

  function reset() {
    setImpressions(''); setClicks(''); setError(null)
  }

  function handleClose() {
    onClose()
    reset()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const impressionsAmt = impressions ? Number(impressions) : 0
    const clicksAmt = clicks ? Number(clicks) : 0
    if (impressionsAmt <= 0 && clicksAmt <= 0) {
      setError('Enter at least one impressions or clicks amount to add')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/analytics`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ impressions: impressionsAmt, clicks: clicksAmt }),
      })
      const body = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Failed to add stats')
        setSubmitting(false)
        return
      }
      handleClose()
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-heading font-bold text-[var(--cr-text-1)]">Add Impressions / Clicks</h3>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--cr-text-muted)] transition-colors hover:bg-[var(--cr-accent-soft)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-4 text-xs text-[var(--cr-text-muted)]">
          Logs additional activity reported back from the ad platform onto this campaign&apos;s running totals.
        </p>

        {error && (
          <div
            className="mb-4 flex items-start gap-2.5 rounded-xl p-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
          >
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Impressions to add</label>
              <input type="number" min="0" value={impressions} onChange={e => setImpressions(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass}>Clicks to add</label>
              <input type="number" min="0" value={clicks} onChange={e => setClicks(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--cr-accent) 0%, var(--cr-accent-2) 100%)', color: 'var(--cr-btn-text)' }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Add
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-2)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

// Self-contained button + dialog — used on the campaign detail page.
export function AddStatsModal({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors"
        style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-2)' }}
      >
        <BarChart3 size={14} /> Add Stats
      </button>
      <AddStatsDialog campaignId={campaignId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
