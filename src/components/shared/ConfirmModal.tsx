'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button + warning icon for destructive actions (default true). */
  danger?: boolean
}

/** Generic in-app replacement for window.confirm() — used for destructive actions like delete. */
export function ConfirmModal({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true,
}: ConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (typeof document === 'undefined') return null

  async function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    setError(null)
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            style={{ zIndex: 10200 }}
            onClick={handleClose}
          />

          <motion.div
            key="confirm-modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 10201 }}
            aria-modal="true"
            role="dialog"
            aria-label={title}
          >
            <div
              className="relative w-full max-w-sm rounded-[24px] p-6 text-center"
              style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={handleClose}
                disabled={submitting}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                style={{ color: 'var(--cr-text-muted)' }}
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>

              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: danger ? 'rgba(239,68,68,0.12)' : 'var(--cr-accent-soft)' }}
              >
                <AlertTriangle className="w-7 h-7" style={{ color: danger ? '#EF4444' : 'var(--cr-accent)' }} />
              </div>

              <h2 className="text-lg font-bold mb-1.5" style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}>
                {title}
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--cr-text-muted)' }}>
                {message}
              </p>

              {error && (
                <p className="text-xs font-medium mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-70"
                  style={danger
                    ? { background: '#EF4444', color: '#fff' }
                    : { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                >
                  {submitting ? 'Please wait…' : confirmLabel}
                </motion.button>
                <button
                  onClick={handleClose}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl text-sm font-semibold border disabled:opacity-50"
                  style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'transparent' }}
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
