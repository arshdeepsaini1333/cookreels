'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ban, X } from 'lucide-react'

export interface BlockConfirmModalProps {
  isOpen:   boolean
  onClose:  () => void
  onConfirm: () => Promise<void> | void
  userName: string
  action:   'block' | 'unblock'
}

export function BlockConfirmModal({ isOpen, onClose, onConfirm, userName, action }: BlockConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const isBlock = action === 'block'

  async function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="block-confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            style={{ zIndex: 10200 }}
            onClick={() => !submitting && onClose()}
          />

          <motion.div
            key="block-confirm-modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 10201 }}
            aria-modal="true"
            role="dialog"
            aria-label={isBlock ? 'Block user' : 'Unblock user'}
          >
            <div
              className="relative w-full max-w-sm rounded-[24px] p-6 text-center"
              style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                disabled={submitting}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                style={{ color: 'var(--cr-text-muted)' }}
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>

              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: isBlock ? 'rgba(239,68,68,0.12)' : 'var(--cr-accent-soft)' }}
              >
                <Ban className="w-7 h-7" style={{ color: isBlock ? '#EF4444' : 'var(--cr-accent)' }} />
              </div>

              <h2
                className="text-lg font-bold mb-1.5"
                style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}
              >
                {isBlock ? `Block ${userName}?` : `Unblock ${userName}?`}
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--cr-text-muted)' }}>
                {isBlock
                  ? "They won't be able to find your profile, recipes or reels — in feed, search, or by link. You won't see theirs either."
                  : 'They will be able to see your profile and posts again, and you can follow each other again.'}
              </p>

              <div className="flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-70"
                  style={isBlock
                    ? { background: '#EF4444', color: '#fff' }
                    : { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                >
                  {submitting
                    ? (isBlock ? 'Blocking…' : 'Unblocking…')
                    : (isBlock ? 'Block' : 'Unblock')}
                </motion.button>
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl text-sm font-semibold border disabled:opacity-50"
                  style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'transparent' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
