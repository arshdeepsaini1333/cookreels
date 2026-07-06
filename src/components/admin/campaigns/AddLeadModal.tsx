'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Plus, X, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import type { LeadStatus } from '@/generated/prisma'

const inputClass = 'w-full rounded-xl py-2.5 px-3.5 text-sm outline-none transition-colors focus:border-[var(--cr-accent)]'
const inputStyle = { background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)' }
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]'

interface LeadEntry {
  key: string
  name: string
  mobile: string
  email: string
  notes: string
  status: LeadStatus
  error?: string
}

let entryCounter = 0
function makeEntry(): LeadEntry {
  entryCounter += 1
  return { key: `entry-${entryCounter}`, name: '', mobile: '', email: '', notes: '', status: 'NEW' }
}

interface AddLeadDialogProps {
  campaignId: string
  open: boolean
  onClose: () => void
}

// Controlled dialog with no trigger of its own — lets both the detail page
// button and the campaigns-list row menu drive the same form.
export function AddLeadDialog({ campaignId, open, onClose }: AddLeadDialogProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [entries, setEntries] = useState<LeadEntry[]>([makeEntry()])

  function reset() {
    setEntries([makeEntry()])
  }

  function handleClose() {
    onClose()
    reset()
  }

  function updateEntry(key: string, patch: Partial<LeadEntry>) {
    setEntries(es => es.map(e => (e.key === key ? { ...e, ...patch, error: undefined } : e)))
  }

  function addEntry() {
    setEntries(es => [...es, makeEntry()])
  }

  function removeEntry(key: string) {
    setEntries(es => (es.length > 1 ? es.filter(e => e.key !== key) : es))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    let hasClientError = false
    const checked = entries.map(entry => {
      if (!entry.name.trim() || !entry.mobile.trim()) {
        hasClientError = true
        return { ...entry, error: 'Name and mobile are required' }
      }
      return { ...entry, error: undefined }
    })
    if (hasClientError) {
      setEntries(checked)
      return
    }

    setSubmitting(true)

    const results = await Promise.all(entries.map(async entry => {
      try {
        const res = await fetch(`/api/admin/campaigns/${campaignId}/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: entry.name,
            mobile: entry.mobile,
            email: entry.email || null,
            notes: entry.notes || null,
            status: entry.status,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string }
          return { key: entry.key, ok: false, error: body.error ?? 'Failed to add lead' }
        }
        return { key: entry.key, ok: true, error: undefined }
      } catch {
        return { key: entry.key, ok: false, error: 'Network error' }
      }
    }))

    const failures = new Map(results.filter(r => !r.ok).map(r => [r.key, r.error]))
    setSubmitting(false)
    router.refresh()

    if (failures.size === 0) {
      handleClose()
      return
    }

    // Keep only the leads that failed, with their error attached, so a retry
    // doesn't re-submit (and duplicate) the ones that already succeeded.
    setEntries(es => es.filter(e => failures.has(e.key)).map(e => ({ ...e, error: failures.get(e.key) })))
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        className="flex w-full max-w-2xl flex-col rounded-2xl shadow-2xl"
        style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', maxHeight: '88vh' }}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-6">
          <div>
            <h3 className="text-base font-heading font-bold text-[var(--cr-text-1)]">Add Leads</h3>
            <p className="mt-1 text-xs text-[var(--cr-text-muted)]">
              Record leads the same way they arrive from a Facebook or Google lead-gen form.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--cr-text-muted)] transition-colors hover:bg-[var(--cr-accent-soft)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-3">
            <div className="flex flex-col gap-5">
              {entries.map((entry, i) => (
                <div
                  key={entry.key}
                  className="flex flex-col gap-3 rounded-xl p-4"
                  style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border-soft)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--cr-text-muted)]">Lead {i + 1}</span>
                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.key)}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--cr-text-muted)] transition-colors hover:bg-[rgba(239,68,68,0.12)] hover:text-[#EF4444]"
                        aria-label="Remove this lead"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {entry.error && (
                    <div
                      className="flex items-start gap-2 rounded-lg p-2.5 text-xs"
                      style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
                    >
                      <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                      <span>{entry.error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Name</label>
                      <input
                        maxLength={100}
                        value={entry.name}
                        onChange={e => updateEntry(entry.key, { name: e.target.value })}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Mobile</label>
                      <input
                        maxLength={20}
                        value={entry.mobile}
                        onChange={e => updateEntry(entry.key, { mobile: e.target.value })}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={entry.email}
                        onChange={e => updateEntry(entry.key, { email: e.target.value })}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Status</label>
                      <select
                        value={entry.status}
                        onChange={e => updateEntry(entry.key, { status: e.target.value as LeadStatus })}
                        className={inputClass}
                        style={inputStyle}
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="DROPPED">Dropped</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Notes</label>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={entry.notes}
                      onChange={e => updateEntry(entry.key, { notes: e.target.value })}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addEntry}
                className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                style={{ border: '1px dashed var(--cr-border)', color: 'var(--cr-text-muted)' }}
              >
                <Plus size={14} /> Add Another Lead
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t px-6 py-4" style={{ borderColor: 'var(--cr-border)' }}>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--cr-accent) 0%, var(--cr-accent-2) 100%)', color: 'var(--cr-btn-text)' }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {entries.length > 1 ? `Add ${entries.length} Leads` : 'Add Lead'}
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
export function AddLeadModal({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, var(--cr-accent) 0%, var(--cr-accent-2) 100%)', color: 'var(--cr-btn-text)' }}
      >
        <Plus size={14} /> Add Lead
      </button>
      <AddLeadDialog campaignId={campaignId} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
