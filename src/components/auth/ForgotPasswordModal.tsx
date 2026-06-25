'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60
const OTP_EXPIRY = 600

type Step = 'email' | 'otp' | 'reset' | 'success'

interface Props {
  onClose: () => void
  onSuccess: (email: string) => void
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function ErrorAlert({ message }: { message: string }) {
  return (
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
      <span>{message}</span>
    </div>
  )
}

function EyeOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' }
  if (score === 2) return { score, label: 'Fair', color: '#f97316' }
  if (score === 3) return { score, label: 'Good', color: '#eab308' }
  return { score, label: 'Strong', color: '#4ade80' }
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Must contain an uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Must contain a lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Must contain a number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Must contain a special character.'
  return null
}

function fmt(secs: number) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function ForgotPasswordModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')

  // Email step
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isEmailLoading, setIsEmailLoading] = useState(false)

  // OTP step
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpInfo, setOtpInfo] = useState<string | null>(null)
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY)
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN)
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null))

  // Reset step
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [newPwTouched, setNewPwTouched] = useState(false)
  const [confirmPwTouched, setConfirmPwTouched] = useState(false)

  const passwordStrength = getPasswordStrength(newPassword)

  // OTP countdown — only active during otp step
  useEffect(() => {
    if (step !== 'otp') return
    const id = setInterval(() => {
      setExpirySeconds(s => (s > 0 ? s - 1 : 0))
      setResendSeconds(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [step])

  // Auto-focus first OTP box when entering that step
  useEffect(() => {
    if (step === 'otp') setTimeout(() => inputRefs.current[0]?.focus(), 50)
  }, [step])

  // Close modal and prefill email after success animation
  useEffect(() => {
    if (step !== 'success') return
    const id = setTimeout(() => {
      onSuccess(email)
    }, 2200)
    return () => clearTimeout(id)
  }, [step, email, onSuccess])

  // ── Email step ────────────────────────────────────────────────────────────

  const handleSendOTP = async () => {
    const trimmed = email.trim()
    if (!trimmed) { setEmailError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setIsEmailLoading(true)
    setEmailError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        setEmail(trimmed)
        setExpirySeconds(OTP_EXPIRY)
        setResendSeconds(RESEND_COOLDOWN)
        setDigits(Array(OTP_LENGTH).fill(''))
        setOtpError(null)
        setOtpInfo(null)
        setStep('otp')
      } else {
        setEmailError((body as { message?: string }).message ?? 'Failed to send code. Please try again.')
      }
    } catch {
      setEmailError('Network error. Please try again.')
    } finally {
      setIsEmailLoading(false)
    }
  }

  // ── OTP step ──────────────────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    setOtpError(null)
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
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
      void handleVerifyOtp()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    setOtpError(null)
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const otp = digits.join('')

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== OTP_LENGTH || isVerifying) return

    setIsVerifying(true)
    setOtpError(null)

    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        setStep('reset')
      } else {
        setOtpError((body as { message?: string }).message ?? 'Verification failed. Please try again.')
      }
    } catch {
      setOtpError('Network error. Please check your connection.')
    } finally {
      setIsVerifying(false)
    }
  }, [otp, email, isVerifying])

  const handleResendOtp = async () => {
    if (resendSeconds > 0 || isResending) return

    setIsResending(true)
    setOtpError(null)
    setOtpInfo(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        setOtpInfo('A new verification code has been sent.')
        setDigits(Array(OTP_LENGTH).fill(''))
        setExpirySeconds(OTP_EXPIRY)
        setResendSeconds(RESEND_COOLDOWN)
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      } else {
        setOtpError((body as { message?: string }).message ?? 'Failed to resend. Please try again.')
      }
    } catch {
      setOtpError('Network error. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  // ── Reset step ────────────────────────────────────────────────────────────

  const handleSavePassword = async () => {
    setNewPwTouched(true)
    setConfirmPwTouched(true)

    const pwError = validatePassword(newPassword)
    if (pwError) { setResetError(pwError); return }
    if (newPassword !== confirmPassword) { setResetError('Passwords do not match.'); return }

    setIsSaving(true)
    setResetError(null)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, confirmPassword }),
      })
      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        setStep('success')
      } else {
        setResetError((body as { message?: string }).message ?? 'Failed to reset password. Please try again.')
      }
    } catch {
      setResetError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Shared modal shell ────────────────────────────────────────────────────

  const shell = (content: React.ReactNode) => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onKeyDown={e => { if (e.key === 'Escape' && step !== 'success') onClose() }}
    >
      <div
        className="relative w-full max-w-sm rounded-[28px] overflow-hidden"
        style={{
          background: 'rgba(28,28,30,0.98)',
          border: '1px solid rgba(52,52,56,0.85)',
          boxShadow: '0 32px 96px rgba(0,0,0,0.85), 0 0 0 1px rgba(52,52,56,0.50)',
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #F5C518 35%, #FF9F1C 65%, transparent)' }}
          aria-hidden="true"
        />

        {step !== 'success' && (
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

        <div className="p-8">{content}</div>
      </div>
    </div>
  )

  // ── Step: email ───────────────────────────────────────────────────────────

  if (step === 'email') {
    return shell(
      <>
        <div
          className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(245,197,24,0.10)', border: '1px solid rgba(245,197,24,0.18)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.5" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-1">Forgot Password</h2>
        <p className="text-sm text-center mb-5" style={{ color: 'rgba(161,161,170,0.85)' }}>
          Enter your registered email address to receive a verification code.
        </p>

        {emailError && <ErrorAlert message={emailError} />}

        <div className="mb-4">
          <label
            className="block text-xs font-bold tracking-widest uppercase mb-1.5"
            style={{ color: 'rgba(245,245,245,0.75)' }}
          >
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailError(null) }}
            onKeyDown={e => { if (e.key === 'Enter') void handleSendOTP() }}
            placeholder="you@example.com"
            autoComplete="email"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${emailError ? 'rgba(248,113,113,0.70)' : 'rgba(255,255,255,0.12)'}`,
              caretColor: '#F5C518',
            }}
          />
        </div>

        <button
          onClick={handleSendOTP}
          disabled={isEmailLoading}
          className={[
            'w-full py-3 rounded-xl font-bold text-sm text-[#1A1A1A]',
            'flex items-center justify-center gap-2 transition-all duration-200',
            isEmailLoading
              ? 'opacity-70 cursor-not-allowed'
              : 'hover:scale-[1.008] active:scale-[0.98] cursor-pointer',
          ].join(' ')}
          style={{
            background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
            boxShadow: '0 4px 20px rgba(245,197,24,0.38)',
          }}
        >
          {isEmailLoading ? (
            <><Spinner className="h-4 w-4" />Sending…</>
          ) : (
            'Send Verification Code'
          )}
        </button>
      </>,
    )
  }

  // ── Step: otp ─────────────────────────────────────────────────────────────

  if (step === 'otp') {
    return shell(
      <>
        <div
          className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(245,197,24,0.10)', border: '1px solid rgba(245,197,24,0.18)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.5" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-1">Verify Your Identity</h2>
        <p className="text-sm text-center mb-0.5" style={{ color: 'rgba(161,161,170,0.85)' }}>
          We&apos;ve sent a 6-digit verification code to
        </p>
        <p className="text-sm font-semibold text-center mb-5" style={{ color: '#F5C518' }}>
          {email}
        </p>

        {otpError && <ErrorAlert message={otpError} />}

        {otpInfo && !otpError && (
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
            {otpInfo}
          </div>
        )}

        <div className="flex gap-2 justify-center mb-4" onPaste={handleOtpPaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleOtpKeyDown(i, e)}
              className="w-11 text-center text-2xl font-bold text-white rounded-xl focus:outline-none focus:ring-2 transition-all duration-150"
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
            <p className="text-xs text-red-400">Code expired. Please request a new one below.</p>
          )}
        </div>

        <button
          onClick={handleVerifyOtp}
          disabled={isVerifying || otp.length !== OTP_LENGTH}
          className={[
            'w-full py-3 rounded-xl font-bold text-sm text-[#1A1A1A]',
            'flex items-center justify-center gap-2 transition-all duration-200 mb-3',
            isVerifying || otp.length !== OTP_LENGTH
              ? 'opacity-55 cursor-not-allowed'
              : 'hover:scale-[1.008] active:scale-[0.98] cursor-pointer',
          ].join(' ')}
          style={{
            background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
            boxShadow: '0 4px 20px rgba(245,197,24,0.38)',
          }}
        >
          {isVerifying ? <><Spinner className="h-4 w-4" />Verifying…</> : 'Verify'}
        </button>

        <button
          onClick={handleResendOtp}
          disabled={resendSeconds > 0 || isResending}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{
            color: resendSeconds > 0 ? 'rgba(255,255,255,0.28)' : '#F5C518',
            cursor: resendSeconds > 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {isResending ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-3.5 w-3.5" />Sending…
            </span>
          ) : resendSeconds > 0 ? (
            `Resend code in ${fmt(resendSeconds)}`
          ) : (
            'Resend Code'
          )}
        </button>
      </>,
    )
  }

  // ── Step: reset ───────────────────────────────────────────────────────────

  if (step === 'reset') {
    const pwError = newPwTouched ? validatePassword(newPassword) : null
    const confirmError =
      confirmPwTouched && newPassword !== confirmPassword ? 'Passwords do not match.' : null

    return shell(
      <>
        <div
          className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(245,197,24,0.10)', border: '1px solid rgba(245,197,24,0.18)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#F5C518" strokeWidth="1.5" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-1">Create New Password</h2>
        <p className="text-sm text-center mb-5" style={{ color: 'rgba(161,161,170,0.85)' }}>
          Choose a strong password for your CookReels account.
        </p>

        {resetError && <ErrorAlert message={resetError} />}

        {/* New password */}
        <div className="mb-3">
          <label
            className="block text-xs font-bold tracking-widest uppercase mb-1.5"
            style={{ color: 'rgba(245,245,245,0.75)' }}
          >
            New Password
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value)
                if (newPwTouched) setResetError(null)
              }}
              onBlur={() => setNewPwTouched(true)}
              placeholder="Enter new password"
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 pr-11 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${pwError ? 'rgba(248,113,113,0.70)' : 'rgba(255,255,255,0.12)'}`,
                caretColor: '#F5C518',
              }}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(p => !p)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 transition-colors"
              style={{ color: 'rgba(255,255,255,0.30)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.30)' }}
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
            </button>
          </div>

          {/* Password strength bar */}
          {newPassword && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      background:
                        passwordStrength.score >= level
                          ? passwordStrength.color
                          : 'rgba(255,255,255,0.12)',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs font-medium" style={{ color: passwordStrength.color }}>
                {passwordStrength.label}
              </p>
            </div>
          )}

          {pwError && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {pwError}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="mb-5">
          <label
            className="block text-xs font-bold tracking-widest uppercase mb-1.5"
            style={{ color: 'rgba(245,245,245,0.75)' }}
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setResetError(null) }}
              onBlur={() => setConfirmPwTouched(true)}
              onKeyDown={e => { if (e.key === 'Enter') void handleSavePassword() }}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 pr-11 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${confirmError ? 'rgba(248,113,113,0.70)' : 'rgba(255,255,255,0.12)'}`,
                caretColor: '#F5C518',
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(p => !p)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 transition-colors"
              style={{ color: 'rgba(255,255,255,0.30)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.30)' }}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
            </button>
          </div>
          {confirmError && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {confirmError}
            </p>
          )}
        </div>

        <button
          onClick={handleSavePassword}
          disabled={isSaving}
          className={[
            'w-full py-3 rounded-xl font-bold text-sm text-[#1A1A1A]',
            'flex items-center justify-center gap-2 transition-all duration-200',
            isSaving
              ? 'opacity-70 cursor-not-allowed'
              : 'hover:scale-[1.008] active:scale-[0.98] cursor-pointer',
          ].join(' ')}
          style={{
            background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
            boxShadow: '0 4px 20px rgba(245,197,24,0.38)',
          }}
        >
          {isSaving ? <><Spinner className="h-4 w-4" />Saving…</> : 'Save Password'}
        </button>
      </>,
    )
  }

  // ── Step: success ─────────────────────────────────────────────────────────

  return shell(
    <div className="text-center py-4">
      <div
        className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Password Reset!</h3>
      <p className="text-sm" style={{ color: 'rgba(161,161,170,0.85)' }}>
        Your password has been reset successfully.
        <br />
        Redirecting you to login…
      </p>
    </div>,
  )
}
