'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: 'var(--cr-text-muted)' }}
      >
        <Lock className="w-3.5 h-3.5" /> {label}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-4 pr-10 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
          style={{
            background:  'var(--cr-bg-surface)',
            color:       'var(--cr-text-1)',
            borderColor: 'var(--cr-border)',
          }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
          tabIndex={-1}
        >
          {visible
            ? <EyeOff className="w-4 h-4" style={{ color: 'var(--cr-text-muted)' }} />
            : <Eye    className="w-4 h-4" style={{ color: 'var(--cr-text-muted)' }} />
          }
        </button>
      </div>
    </div>
  )
}

export function ChangePasswordModal({ open, onClose, onSuccess }: ChangePasswordModalProps) {
  const [mounted,         setMounted]         = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setSaving(false)
    }
  }, [open])

  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword
  const mismatch       = confirmPassword.length > 0 && newPassword !== confirmPassword
  const tooShort       = newPassword.length > 0 && newPassword.length < 8

  const canSave =
    !saving &&
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    passwordsMatch

  const handleSave = async () => {
    if (!canSave) return
    setError(null)
    setSaving(true)

    try {
      const res  = await fetch('/api/profile/change-password', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to change password')
        setSaving(false)
        return
      }

      onSuccess()
      onClose()
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="cp-modal"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-md flex flex-col rounded-3xl overflow-hidden"
              style={{
                background: 'var(--cr-bg-card)',
                boxShadow:  '0 24px 80px rgba(0,0,0,0.45)',
                maxHeight:  'min(92dvh, 560px)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-5 flex-shrink-0 border-b"
                style={{ borderColor: 'var(--cr-border)' }}
              >
                <h2
                  className="text-lg font-bold"
                  style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}
                >
                  Change Password
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
                </button>
              </div>

              {/* Scrollable body */}
              <div
                className="flex-1 overflow-y-auto px-6 py-5 space-y-4 edit-profile-scroll"
                style={{ overscrollBehavior: 'contain' }}
              >
                {/* Error banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <PasswordField
                  label="Current Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Enter your current password"
                />

                <PasswordField
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="At least 8 characters"
                />

                {/* Too short hint */}
                <AnimatePresence>
                  {tooShort && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="-mt-2 text-xs font-medium"
                      style={{ color: '#ef4444' }}
                    >
                      Password must be at least 8 characters
                    </motion.p>
                  )}
                </AnimatePresence>

                <PasswordField
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repeat your new password"
                />

                {/* Match / mismatch indicator */}
                <AnimatePresence>
                  {(passwordsMatch || mismatch) && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="-mt-2 flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: passwordsMatch ? '#22c55e' : '#ef4444' }}
                    >
                      {passwordsMatch
                        ? <><CheckCircle className="w-3.5 h-3.5" /> Passwords match</>
                        : <><AlertCircle className="w-3.5 h-3.5" /> Passwords do not match</>
                      }
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div
                className="flex items-center gap-3 px-6 py-4 flex-shrink-0 border-t"
                style={{ borderColor: 'var(--cr-border)' }}
              >
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                  style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-surface)' }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSave}
                  whileHover={canSave ? { scale: 1.03 } : {}}
                  whileTap={canSave ? { scale: 0.97 } : {}}
                  disabled={!canSave}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: canSave ? 'linear-gradient(135deg,#F5C518,#FFB800)' : 'var(--cr-bg-surface)',
                    color:      canSave ? '#1A1A1A' : 'var(--cr-text-muted)',
                    border:     canSave ? 'none' : '1px solid var(--cr-border)',
                    opacity:    canSave ? 1 : 0.6,
                  }}
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : 'Update Password'
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
