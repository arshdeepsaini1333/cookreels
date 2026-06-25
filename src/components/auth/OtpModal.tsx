'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60   // seconds before resend is enabled
const OTP_EXPIRY = 600       // 10 minutes in seconds

interface OtpModalProps {
  email: string
  /** Banner message shown at the top of the modal (e.g. signup-case-specific text). */
  message?: string
  /** Called after the session cookie is set and the user should be redirected. */
  onSuccess: () => void
  /** Optional: allow dismissing the modal to go back to the form. */
  onClose?: () => void
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export default function OtpModal({ email, message, onSuccess, onClose }: OtpModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Two separate timers: expiry countdown (10 min) and resend cooldown (60 s)
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY)
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN)

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null))

  // Countdown tick
  useEffect(() => {
    const id = setInterval(() => {
      setExpirySeconds(s => (s > 0 ? s - 1 : 0))
      setResendSeconds(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const fmt = (secs: number) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setError(null)
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    } else if (e.key === 'Enter') {
      void handleVerify()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    setError(null)
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1)
    inputRefs.current[focusIdx]?.focus()
  }

  const otp = digits.join('')

  const handleVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH || isVerifying) return

    setIsVerifying(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        setSuccess(true)
        // Brief success display before redirect
        setTimeout(() => onSuccess(), 1400)
      } else {
        setError((body as { message?: string }).message ?? 'Verification failed. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setIsVerifying(false)
    }
  }, [otp, email, isVerifying, onSuccess])

  const handleResend = async () => {
    if (resendSeconds > 0 || isResending) return

    setIsResending(true)
    setError(null)
    setInfoMsg(null)

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        setInfoMsg('A new verification code has been sent.')
        setDigits(Array(OTP_LENGTH).fill(''))
        setExpirySeconds(OTP_EXPIRY)
        setResendSeconds(RESEND_COOLDOWN)
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      } else {
        setError((body as { message?: string }).message ?? 'Failed to resend. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      // Allow pressing Escape to close (if onClose provided)
      onKeyDown={e => { if (e.key === 'Escape' && onClose) onClose() }}
    >
      <div
        className="relative w-full max-w-sm rounded-[28px] overflow-hidden"
        style={{
          background: 'rgba(28,28,30,0.98)',
          border: '1px solid rgba(52,52,56,0.85)',
          boxShadow: '0 32px 96px rgba(0,0,0,0.85), 0 0 0 1px rgba(52,52,56,0.50)',
        }}
      >
        {/* Yellow accent strip */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #F5C518 35%, #FF9F1C 65%, transparent)' }}
          aria-hidden="true"
        />

        {/* Close button */}
        {onClose && !success && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)' }}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="p-8">
          {success ? (
            /* ── Success state ── */
            <div className="text-center py-4">
              <div
                className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Email Verified!</h3>
              <p className="text-sm" style={{ color: 'rgba(161,161,170,0.85)' }}>
                Your account has been activated. Redirecting you now…
              </p>
            </div>
          ) : (
            /* ── Main verification UI ── */
            <>
              {/* Email icon */}
              <div
                className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(245,197,24,0.10)', border: '1px solid rgba(245,197,24,0.18)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.5" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-white text-center mb-1">Verify Your Email</h2>
              <p className="text-sm text-center mb-0.5" style={{ color: 'rgba(161,161,170,0.85)' }}>
                We&apos;ve sent a 6-digit code to
              </p>
              <p className="text-sm font-semibold text-center mb-5" style={{ color: '#F5C518' }}>
                {email}
              </p>

              {/* Contextual banner (case-specific message from signup/login) */}
              {message && (
                <div
                  className="mb-4 p-3 rounded-xl text-xs text-center leading-relaxed"
                  style={{
                    background: 'rgba(245,197,24,0.07)',
                    border: '1px solid rgba(245,197,24,0.14)',
                    color: 'rgba(245,197,24,0.85)',
                  }}
                >
                  {message}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div
                  className="mb-4 p-3 rounded-xl text-xs flex items-start gap-2"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.18)',
                    color: '#F87171',
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 mt-px">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Resend success message */}
              {infoMsg && !error && (
                <div
                  className="mb-4 p-3 rounded-xl text-xs flex items-center gap-2"
                  style={{
                    background: 'rgba(74,222,128,0.07)',
                    border: '1px solid rgba(74,222,128,0.18)',
                    color: '#4ade80',
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  {infoMsg}
                </div>
              )}

              {/* 6 digit input boxes */}
              <div
                className="flex gap-2 justify-center mb-4"
                onPaste={handlePaste}
              >
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="w-11 h-13 text-center text-2xl font-bold text-white rounded-xl focus:outline-none focus:ring-2 transition-all duration-150"
                    style={{
                      background: digit ? 'rgba(245,197,24,0.10)' : 'rgba(255,255,255,0.055)',
                      border: `1.5px solid ${digit ? 'rgba(245,197,24,0.55)' : 'rgba(255,255,255,0.12)'}`,
                      caretColor: '#F5C518',
                      height: '52px',
                    }}
                    aria-label={`Verification digit ${i + 1}`}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {/* Expiry countdown */}
              <div className="text-center mb-5">
                {expirySeconds > 0 ? (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Code expires in{' '}
                    <span
                      className="font-mono font-semibold"
                      style={{ color: expirySeconds < 60 ? '#F87171' : 'rgba(245,197,24,0.75)' }}
                    >
                      {fmt(expirySeconds)}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-red-400">
                    Code expired. Please request a new one below.
                  </p>
                )}
              </div>

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={isVerifying || otp.length !== OTP_LENGTH}
                className={[
                  'w-full py-3 rounded-xl font-bold text-sm text-[#1A1A1A]',
                  'flex items-center justify-center gap-2',
                  'transition-all duration-200 mb-3',
                  isVerifying || otp.length !== OTP_LENGTH
                    ? 'opacity-55 cursor-not-allowed'
                    : 'hover:scale-[1.008] active:scale-[0.98] cursor-pointer',
                ].join(' ')}
                style={{
                  background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
                  boxShadow: '0 4px 20px rgba(245,197,24,0.38)',
                }}
              >
                {isVerifying ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    Verifying…
                  </>
                ) : (
                  'Verify Email'
                )}
              </button>

              {/* Resend button */}
              <button
                onClick={handleResend}
                disabled={resendSeconds > 0 || isResending}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  color: resendSeconds > 0 ? 'rgba(255,255,255,0.28)' : '#F5C518',
                  cursor: resendSeconds > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {isResending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-3.5 w-3.5" />
                    Sending…
                  </span>
                ) : resendSeconds > 0 ? (
                  `Resend code in ${fmt(resendSeconds)}`
                ) : (
                  'Resend verification code'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
