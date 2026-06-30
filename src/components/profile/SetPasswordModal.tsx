'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, KeyRound } from 'lucide-react'

type Step = 'email' | 'otp' | 'password'

interface SetPasswordModalProps {
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
          autoComplete="new-password"
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

const STEPS: Step[] = ['email', 'otp', 'password']

export function SetPasswordModal({ open, onClose, onSuccess }: SetPasswordModalProps) {
  const [mounted,         setMounted]         = useState(false)
  const [step,            setStep]            = useState<Step>('email')
  const [email,           setEmail]           = useState('')
  const [otp,             setOtp]             = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [resendCooldown,  setResendCooldown]  = useState(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      setStep('email')
      setEmail('')
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setLoading(false)
      setResendCooldown(0)
    }
  }, [open])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const sendOtp = async () => {
    if (!email.trim()) { setError('Please enter your email address'); return }
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch('/api/profile/set-password/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send code'); setLoading(false); return }
      setStep('otp')
      setResendCooldown(60)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!otp.trim()) { setError('Please enter the verification code'); return }
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch('/api/profile/set-password/verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Invalid code'); setLoading(false); return }
      setStep('password')
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const confirmPassword_ = async () => {
    if (newPassword.length < 8)       { setError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch('/api/profile/set-password/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ newPassword, confirmPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to set password'); setLoading(false); return }
      onSuccess()
      onClose()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    if (resendCooldown > 0 || loading) return
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch('/api/profile/set-password/send-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to resend code'); return }
      setResendCooldown(60)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword
  const mismatch       = confirmPassword.length > 0 && newPassword !== confirmPassword
  const tooShort       = newPassword.length > 0 && newPassword.length < 8

  const handlePrimary = step === 'email' ? sendOtp : step === 'otp' ? verifyOtp : confirmPassword_

  const stepTitles: Record<Step, string> = {
    email:    'Set Password',
    otp:      'Verify Email',
    password: 'Create Password',
  }

  const primaryLabel = step === 'email' ? 'Send Code' : step === 'otp' ? 'Verify Code' : 'Set Password'
  const loadingLabel = step === 'email' ? 'Sending…'  : step === 'otp' ? 'Verifying…' : 'Setting…'

  const stepIndex = STEPS.indexOf(step)

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            key="sp-modal"
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
                <div>
                  <h2
                    className="text-lg font-bold"
                    style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}
                  >
                    {stepTitles[step]}
                  </h2>
                  {/* Step dots */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {STEPS.map((s, i) => (
                      <div
                        key={s}
                        className="h-1 rounded-full transition-all duration-300"
                        style={{
                          width:      i === stepIndex ? 20 : 8,
                          background: i <= stepIndex ? 'var(--cr-accent)' : 'var(--cr-border)',
                          opacity:    i === stepIndex ? 1 : i < stepIndex ? 0.6 : 0.35,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
                </button>
              </div>

              {/* Body */}
              <div
                className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
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

                <AnimatePresence mode="wait">

                  {step === 'email' && (
                    <motion.div
                      key="step-email"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--cr-text-2)' }}>
                        Enter the email address you used to sign in with Google. We'll send a verification code to confirm it's you.
                      </p>
                      <div>
                        <label
                          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2"
                          style={{ color: 'var(--cr-text-muted)' }}
                        >
                          <Mail className="w-3.5 h-3.5" /> Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendOtp()}
                          placeholder="your@email.com"
                          autoComplete="email"
                          className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                          style={{
                            background:  'var(--cr-bg-surface)',
                            color:       'var(--cr-text-1)',
                            borderColor: 'var(--cr-border)',
                          }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 'otp' && (
                    <motion.div
                      key="step-otp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--cr-text-2)' }}>
                        We sent a 6-digit code to{' '}
                        <strong style={{ color: 'var(--cr-text-1)' }}>{email}</strong>.
                        {' '}Enter it below.
                      </p>
                      <div>
                        <label
                          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-2"
                          style={{ color: 'var(--cr-text-muted)' }}
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Verification Code
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                          placeholder="000000"
                          maxLength={6}
                          autoComplete="one-time-code"
                          className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border tracking-[0.4em] text-center"
                          style={{
                            background:  'var(--cr-bg-surface)',
                            color:       'var(--cr-text-1)',
                            borderColor: 'var(--cr-border)',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs" style={{ color: 'var(--cr-text-muted)' }}>
                          Didn&apos;t receive a code?
                        </p>
                        <button
                          onClick={resendOtp}
                          disabled={resendCooldown > 0 || loading}
                          className="text-xs font-semibold transition-opacity disabled:opacity-50"
                          style={{ color: 'var(--cr-accent)' }}
                        >
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 'password' && (
                    <motion.div
                      key="step-password"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
                      >
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        Email verified! Now create a password for your account.
                      </div>
                      <PasswordField
                        label="New Password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="Min. 8 characters"
                      />
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
                        label="Confirm Password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="Repeat your new password"
                      />
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
                    </motion.div>
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
                  onClick={handlePrimary}
                  whileHover={!loading ? { scale: 1.03 } : {}}
                  whileTap={!loading  ? { scale: 0.97 } : {}}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: 'linear-gradient(135deg,#F5C518,#FFB800)',
                    color:      '#1A1A1A',
                    opacity:    loading ? 0.7 : 1,
                  }}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {loadingLabel}</>
                    : primaryLabel
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
