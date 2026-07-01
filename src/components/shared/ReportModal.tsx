'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flag, Loader2, CheckCircle2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportTargetType = 'USER' | 'RECIPE' | 'REEL' | 'RECIPE_COMMENT' | 'REEL_COMMENT'

export interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  targetType: ReportTargetType
  targetId: string
  onReported?: () => void
}

const REASONS: { value: string; label: string; description: string }[] = [
  { value: 'SPAM',                  label: 'Spam',                  description: 'Unwanted commercial or repetitive content' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content', description: 'Nudity, violence, or other disturbing material' },
  { value: 'HARASSMENT',            label: 'Harassment',            description: 'Bullying, threats, or targeted abuse' },
  { value: 'HATE_SPEECH',           label: 'Hate Speech',           description: 'Promotes hatred based on identity or beliefs' },
  { value: 'MISINFORMATION',        label: 'Misinformation',        description: 'False or misleading information' },
  { value: 'VIOLENCE',              label: 'Violence',              description: 'Graphic violence or glorification of harm' },
  { value: 'OTHER',                 label: 'Other',                 description: 'Something not listed above' },
]

const TYPE_LABEL: Record<ReportTargetType, string> = {
  USER:           'user',
  RECIPE:         'recipe',
  REEL:           'reel',
  RECIPE_COMMENT: 'comment',
  REEL_COMMENT:   'comment',
}

// ─── ReportModal ──────────────────────────────────────────────────────────────

export function ReportModal({ isOpen, onClose, targetType, targetId, onReported }: ReportModalProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [step, setStep] = useState<'reason' | 'details' | 'done'>('reason')
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const typeLabel = TYPE_LABEL[targetType]

  // Theme-aware tokens
  const bg       = isDark ? '#1C1C1E' : '#FFFFFF'
  const surface  = isDark ? '#2B2B2D' : '#F5F5F5'
  const border   = isDark ? '#343438' : '#E5E5E5'
  const text1    = isDark ? '#F5F5F5' : '#1A1A1A'
  const text2    = isDark ? '#A1A1AA' : '#6B7280'
  const muted    = isDark ? '#52525B' : '#9CA3AF'

  // Auto-close and refresh 1.5s after reaching the done step
  useEffect(() => {
    if (step !== 'done') return
    const t = setTimeout(() => {
      onReported?.()
      handleClose()
      router.refresh()
    }, 1500)
    return () => clearTimeout(t)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    onClose()
    setTimeout(() => {
      setStep('reason')
      setSelectedReason('')
      setDescription('')
      setError(null)
    }, 300)
  }

  async function handleSubmit() {
    if (!selectedReason) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: targetType,
          targetId,
          reason: selectedReason,
          description: description.trim() || undefined,
        }),
      })
      if (res.status === 409) { setStep('done'); return }
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setStep('done')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="report-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            style={{ zIndex: 10200 }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="report-modal"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 sm:inset-0 flex items-end sm:items-center justify-center sm:p-4"
            style={{ zIndex: 10201 }}
            aria-modal="true"
            role="dialog"
            aria-label={`Report ${typeLabel}`}
          >
            <div
              className="w-full max-w-sm rounded-t-[24px] sm:rounded-[24px] overflow-y-auto"
              style={{
                background: bg,
                border: `1px solid ${border}`,
                boxShadow: isDark
                  ? '0 20px 60px rgba(0,0,0,0.60), 0 0 0 1px rgba(52,52,56,0.80)'
                  : '0 20px 60px rgba(0,0,0,0.20)',
                maxHeight: 'calc(100dvh - 48px)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: border }}
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4" style={{ color: '#EF4444' }} />
                  <h2 className="text-sm font-semibold" style={{ color: text1 }}>
                    {step === 'done' ? 'Report Submitted' : `Report ${typeLabel}`}
                  </h2>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{ background: surface }}
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" style={{ color: text2 }} />
                </button>
              </div>

              {/* Body */}
              <AnimatePresence mode="wait">
                {step === 'reason' && (
                  <motion.div
                    key="reason"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1,  x: 0 }}
                    exit={{ opacity: 0,     x: 12 }}
                    transition={{ duration: 0.18 }}
                    className="p-5"
                  >
                    <p className="text-xs mb-4" style={{ color: text2 }}>
                      Why are you reporting this {typeLabel}? Your report is anonymous.
                    </p>
                    <div className="space-y-2">
                      {REASONS.map(r => (
                        <button
                          key={r.value}
                          onClick={() => setSelectedReason(r.value)}
                          className="w-full text-left rounded-xl px-3.5 py-3 transition-all duration-150"
                          style={{
                            background: selectedReason === r.value
                              ? 'rgba(239,68,68,0.10)'
                              : surface,
                            border: `1px solid ${selectedReason === r.value ? 'rgba(239,68,68,0.35)' : 'transparent'}`,
                          }}
                        >
                          <p className="text-xs font-semibold" style={{ color: text1 }}>{r.label}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: muted }}>{r.description}</p>
                        </button>
                      ))}
                    </div>

                    {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

                    <button
                      onClick={() => selectedReason && setStep('details')}
                      disabled={!selectedReason}
                      className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: '#EF4444', color: '#fff' }}
                    >
                      Continue
                    </button>
                  </motion.div>
                )}

                {step === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1,  x: 0 }}
                    exit={{ opacity: 0,     x: -12 }}
                    transition={{ duration: 0.18 }}
                    className="p-5"
                  >
                    <p className="text-xs mb-4" style={{ color: text2 }}>
                      Add any extra context (optional — max 500 characters).
                    </p>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value.slice(0, 500))}
                      placeholder="Describe the issue…"
                      rows={4}
                      className="w-full text-xs rounded-xl px-3.5 py-3 resize-none outline-none transition-all placeholder:opacity-50"
                      style={{
                        background: surface,
                        border: `1px solid ${border}`,
                        color: text1,
                      }}
                    />
                    <p className="text-[10px] text-right mt-1" style={{ color: muted }}>
                      {description.length}/500
                    </p>

                    {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => { setStep('reason'); setError(null) }}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                        style={{ background: surface, color: text2 }}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 disabled:opacity-70"
                        style={{ background: '#EF4444', color: '#fff' }}
                      >
                        {submitting
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                          : 'Submit Report'
                        }
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1,  scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-8 text-center"
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.10)' }}
                    >
                      <CheckCircle2 className="w-7 h-7" style={{ color: '#22C55E' }} />
                    </div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: text1 }}>
                      Thank you for the report
                    </h3>
                    <p className="text-xs leading-relaxed mb-6" style={{ color: text2 }}>
                      We take every report seriously. Our team will review this {typeLabel} and take appropriate action.
                    </p>
                    <button
                      onClick={handleClose}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                      style={{ background: surface, color: text1 }}
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
