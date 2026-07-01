'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, X } from 'lucide-react'

export interface LoginPromptModalProps {
  isOpen:      boolean
  onClose:     () => void
  redirectTo:  string
  userName?:   string
}

export function LoginPromptModal({ isOpen, onClose, redirectTo, userName }: LoginPromptModalProps) {
  const router = useRouter()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="login-prompt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            style={{ zIndex: 10200 }}
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            key="login-prompt-modal"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 10201 }}
            aria-modal="true"
            role="dialog"
            aria-label="Login required"
          >
            <div
              className="relative w-full max-w-sm rounded-[24px] p-6 text-center"
              style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ color: 'var(--cr-text-muted)' }}
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>

              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--cr-accent-soft)' }}
              >
                <Lock className="w-7 h-7" style={{ color: 'var(--cr-accent)' }} />
              </div>

              <h2
                className="text-lg font-bold mb-1.5"
                style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}
              >
                Login to view profile
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--cr-text-muted)' }}>
                Sign in to see {userName ? `${userName}'s` : "this chef's"} full profile, recipes and reels.
              </p>

              <div className="flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/auth/login?next=${encodeURIComponent(redirectTo)}`)}
                  className="w-full py-3 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                >
                  Log in
                </motion.button>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl text-sm font-semibold border"
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
