'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type FormData = {
  identifier: string
  password: string
}

type FormErrors = Partial<Record<keyof FormData, string>>
type TouchedFields = Partial<Record<keyof FormData, boolean>>

const INITIAL_DATA: FormData = {
  identifier: '',
  password: '',
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.identifier.trim()) errors.identifier = 'Email or username is required'
  if (!data.password) errors.password = 'Password is required'
  return errors
}

// ── Icons ────────────────────────────────────────────────────────────────────

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

function ErrorIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ── InputField ───────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string
  name: keyof FormData
  type?: string
  value: string
  error?: string
  touched?: boolean
  placeholder: string
  autoComplete: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void
  rightElement?: React.ReactNode
}

function InputField({
  label,
  name,
  type = 'text',
  value,
  error,
  touched,
  placeholder,
  autoComplete,
  onChange,
  onBlur,
  rightElement,
}: InputFieldProps) {
  const hasError = touched && !!error

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-bold tracking-widest uppercase mb-1.5"
        style={{ color: 'rgba(245,245,245,0.75)' }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={[
            'w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30',
            'focus:outline-none focus:ring-2',
            'transition-all duration-200',
            rightElement ? 'pr-11' : '',
            hasError
              ? 'border-red-400/70 focus:ring-red-400/25 focus:border-red-400'
              : 'hover:border-[#F5C518]/45 focus:ring-[#F5C518]/20 focus:border-[#F5C518]/70',
          ].join(' ')}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${hasError ? 'rgba(248,113,113,0.70)' : 'rgba(255,255,255,0.12)'}`,
            caretColor: '#F5C518',
          }}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
            {rightElement}
          </div>
        )}
      </div>
      {hasError && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <ErrorIcon />
          {error}
        </p>
      )}
    </div>
  )
}

// ── LoginForm ────────────────────────────────────────────────────────────────

export default function LoginForm() {
  const router = useRouter()

  const [formData, setFormData] = useState<FormData>(INITIAL_DATA)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<TouchedFields>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err === 'oauth_cancelled') setServerError('Google sign-in was cancelled.')
    else if (err === 'oauth_failed') setServerError('Google sign-in failed. Please try again.')
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const key = name as keyof FormData
    const updated = { ...formData, [key]: value }
    setFormData(updated)
    if (touched[key]) {
      const fieldError = validate(updated)[key]
      setErrors((prev) => ({ ...prev, [key]: fieldError }))
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const key = e.target.name as keyof FormData
    setTouched((prev) => ({ ...prev, [key]: true }))
    const fieldError = validate(formData)[key]
    setErrors((prev) => ({ ...prev, [key]: fieldError }))
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()

    const allTouched = Object.fromEntries(
      (Object.keys(INITIAL_DATA) as (keyof FormData)[]).map((k) => [k, true]),
    ) as TouchedFields
    setTouched(allTouched)

    const validationErrors = validate(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsLoading(true)
    setServerError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password,
        }),
      })

      if (res.ok) {
        router.push('/')
      } else {
        const body = await res.json().catch(() => ({}))
        setServerError(
          (body as { message?: string }).message ?? 'Invalid credentials. Please try again.',
        )
      }
    } catch {
      setServerError('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md animate-card-in">
      {/* Mobile-only compact branding */}
      <div className="lg:hidden text-center mb-5 animate-fade-in">
        <div className="inline-flex items-center mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cookreels_ligt_logo.png" alt="CookReels" className="h-9 object-contain" />
        </div>
      </div>

      {/* Premium dark glass card */}
      <div
        className="relative backdrop-blur-3xl rounded-[28px] shadow-2xl overflow-hidden p-6 sm:p-8"
        style={{
          background: 'rgba(30,30,31,0.88)',
          border: '1px solid rgba(52,52,56,0.80)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(52,52,56,0.50)',
        }}
      >
        {/* Top accent gradient strip — yellow */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #F5C518 35%, #FF9F1C 65%, transparent)' }}
          aria-hidden="true"
        />

        {/* Subtle yellow glow at top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(245,197,24,0.06) 0%, transparent 70%)' }}
        />

        <div className="mb-6">
          <h2
            className="font-heading text-2xl font-bold mb-1 tracking-tight bg-gradient-to-r from-white via-white/95 to-[#F5C518]/75 bg-clip-text text-transparent"
          >
            Welcome back
          </h2>
          <p className="text-sm" style={{ color: 'rgba(161,161,170,0.90)' }}>
            Sign in to continue your culinary journey
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div
            className="mb-5 p-3.5 rounded-xl text-sm flex items-start gap-2.5"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.20)',
              color: '#F87171',
            }}
          >
            <ErrorIcon />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <InputField
            label="Email or Username"
            name="identifier"
            type="text"
            value={formData.identifier}
            error={errors.identifier}
            touched={touched.identifier}
            placeholder="you@example.com or @handle"
            autoComplete="username"
            onChange={handleChange}
            onBlur={handleBlur}
          />

          {/* Password with inline forgot-password label */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-bold tracking-widest uppercase"
                style={{ color: 'rgba(245,245,245,0.75)' }}
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs font-medium transition-colors"
                style={{ color: 'rgba(245,197,24,0.70)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#F5C518' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(245,197,24,0.70)' }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your password"
                autoComplete="current-password"
                className={[
                  'w-full px-3.5 py-2.5 pr-11 rounded-xl text-sm text-white placeholder:text-white/30',
                  'focus:outline-none focus:ring-2',
                  'transition-all duration-200',
                  touched.password && errors.password
                    ? 'border-red-400/70 focus:ring-red-400/25 focus:border-red-400'
                    : 'hover:border-[#F5C518]/45 focus:ring-[#F5C518]/20 focus:border-[#F5C518]/70',
                ].join(' ')}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${touched.password && errors.password ? 'rgba(248,113,113,0.70)' : 'rgba(255,255,255,0.12)'}`,
                  caretColor: '#F5C518',
                }}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="transition-colors"
                  style={{ color: 'rgba(255,255,255,0.30)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.30)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
                </button>
              </div>
            </div>
            {touched.password && errors.password && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <ErrorIcon />
                {errors.password}
              </p>
            )}
          </div>

          {/* Login button — premium yellow gradient */}
          <button
            type="submit"
            disabled={isLoading}
            className={[
              'w-full py-3 mt-1 rounded-xl font-bold text-sm text-[#1A1A1A]',
              'flex items-center justify-center gap-2',
              'transition-all duration-200',
              'hover:scale-[1.008] active:scale-[0.98]',
              isLoading ? 'opacity-70 cursor-not-allowed' : '',
            ].join(' ')}
            style={{
              background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
              boxShadow: '0 4px 20px rgba(245,197,24,0.40), 0 1px 3px rgba(245,197,24,0.25)',
            }}
            onMouseEnter={e => {
              if (!isLoading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(245,197,24,0.52), 0 2px 6px rgba(245,197,24,0.30)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(245,197,24,0.40), 0 1px 3px rgba(245,197,24,0.25)'
            }}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
          </div>

          {/* Google button */}
          <button
            type="button"
            disabled={isGoogleLoading || isLoading}
            onClick={() => {
              setIsGoogleLoading(true)
              window.location.href = '/api/auth/google'
            }}
            className={[
              'w-full py-2.5 rounded-xl',
              'bg-white hover:bg-white/92',
              'text-zinc-800 font-medium text-sm',
              'flex items-center justify-center gap-3',
              'transition-all duration-150',
              'hover:shadow-md hover:shadow-white/10',
              'active:scale-[0.98]',
              isGoogleLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {isGoogleLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-zinc-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Redirecting…
              </>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-5 text-center text-sm" style={{ color: 'rgba(161,161,170,0.80)' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className="font-bold transition-colors"
            style={{ color: '#F5C518' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#FFD84D' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#F5C518' }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
