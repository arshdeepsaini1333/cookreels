'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60 // seconds — matches OTP_RESEND_COOLDOWN_SECONDS in lib/otp.ts
const OTP_EXPIRY = 600     // seconds — matches OTP_EXPIRY_MINUTES in lib/otp.ts

interface AdminOtpStepProps {
  email: string
  onVerified: () => void
  onBack: () => void
}

export function AdminOtpStep({ email, onVerified, onBack }: AdminOtpStepProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY)
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN)

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(OTP_LENGTH).fill(null))

  useEffect(() => {
    const id = setInterval(() => {
      setExpirySeconds(s => (s > 0 ? s - 1 : 0))
      setResendSeconds(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [])

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
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const otp = digits.join('')

  const handleVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH || isVerifying) return

    setIsVerifying(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const body = await res.json().catch(() => ({})) as { message?: string }

      if (res.ok) {
        onVerified()
        return
      }
      setError(body.message ?? 'Verification failed. Please try again.')
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setIsVerifying(false)
    }
  }, [otp, email, isVerifying, onVerified])

  const handleResend = async () => {
    if (resendSeconds > 0 || isResending) return

    setIsResending(true)
    setError(null)
    setInfoMsg(null)

    try {
      const res = await fetch('/api/admin/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await res.json().catch(() => ({})) as { message?: string }

      if (res.ok) {
        setInfoMsg('A new verification code has been sent.')
        setDigits(Array(OTP_LENGTH).fill(''))
        setExpirySeconds(OTP_EXPIRY)
        setResendSeconds(RESEND_COOLDOWN)
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      } else {
        setError(body.message ?? 'Failed to resend. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col items-center text-center">
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #F5C518 0%, #FFD84D 40%, #FF9F1C 100%)',
            boxShadow: '0 8px 32px rgba(245,197,24,0.28), 0 2px 8px rgba(245,197,24,0.18), 0 0 0 1px rgba(245,197,24,0.22)',
          }}
        >
          <Mail size={21} strokeWidth={2} color="#1A1A1A" />
        </div>
        <h1 className="font-heading text-xl font-bold text-white">Check your email</h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(161,161,170,0.90)' }}>
          We sent a 6-digit code to
        </p>
        <p className="text-sm font-semibold" style={{ color: '#F5C518' }}>{email}</p>
      </div>

      {error && (
        <div
          className="mb-4 flex items-start gap-2.5 rounded-xl p-3.5 text-sm"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#F87171' }}
        >
          <AlertCircle size={16} strokeWidth={2} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {infoMsg && !error && (
        <div
          className="mb-4 flex items-center gap-2.5 rounded-xl p-3.5 text-sm"
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)', color: '#4ade80' }}
        >
          <CheckCircle2 size={16} strokeWidth={2} className="flex-shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}

      <div className="mb-4 flex justify-center gap-2" onPaste={handlePaste}>
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
            className="h-13 w-11 rounded-xl text-center text-2xl font-bold text-white transition-all duration-150 focus:outline-none focus:ring-2"
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

      <div className="mb-5 text-center">
        {expirySeconds > 0 ? (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Code expires in{' '}
            <span className="font-mono font-semibold" style={{ color: expirySeconds < 60 ? '#F87171' : 'rgba(245,197,24,0.75)' }}>
              {fmt(expirySeconds)}
            </span>
          </p>
        ) : (
          <p className="text-xs text-red-400">Code expired. Request a new one below.</p>
        )}
      </div>

      <button
        onClick={handleVerify}
        disabled={isVerifying || otp.length !== OTP_LENGTH}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#1A1A1A] transition-all duration-200 hover:scale-[1.008] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
        style={{
          background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
          boxShadow: '0 4px 20px rgba(245,197,24,0.38)',
        }}
      >
        {isVerifying ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Verifying…
          </>
        ) : (
          'Verify & Sign In'
        )}
      </button>

      <button
        onClick={handleResend}
        disabled={resendSeconds > 0 || isResending}
        className="w-full rounded-xl py-2.5 text-sm font-medium transition-all duration-150"
        style={{ color: resendSeconds > 0 ? 'rgba(255,255,255,0.28)' : '#F5C518' }}
      >
        {isResending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Sending…
          </span>
        ) : resendSeconds > 0 ? (
          `Resend code in ${fmt(resendSeconds)}`
        ) : (
          'Resend verification code'
        )}
      </button>

      <button
        onClick={onBack}
        className="mt-1 w-full rounded-xl py-2 text-xs font-medium transition-colors"
        style={{ color: 'rgba(255,255,255,0.35)' }}
      >
        &larr; Back to sign in
      </button>
    </>
  )
}
