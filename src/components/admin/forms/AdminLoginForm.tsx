'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, AlertCircle, Loader2, Eye, EyeOff, Mail, Lock, ShieldCheck } from 'lucide-react'
import { AdminOtpStep } from '@/components/admin/forms/AdminOtpStep'

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export function AdminLoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setServerError(null)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const body = await res.json().catch(() => ({})) as { requiresOtp?: boolean; message?: string }

      if (res.ok && body.requiresOtp) {
        setStep('otp')
        return
      }

      setServerError(body.message ?? 'Invalid credentials. Please try again.')
    } catch {
      setServerError('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-sm"
    >
      <div
        className="relative overflow-hidden rounded-[28px] p-6 backdrop-blur-3xl sm:p-8"
        style={{
          background: 'rgba(30,30,31,0.90)',
          border: '1px solid rgba(52,52,56,0.80)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(52,52,56,0.50)',
        }}
      >
        {/* Top accent gradient strip */}
        <div
          className="absolute left-0 right-0 top-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #F5C518 35%, #FF9F1C 65%, transparent)' }}
        />
        {/* Soft glow behind the header */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-28 w-56 -translate-x-1/2"
          style={{ background: 'radial-gradient(ellipse, rgba(245,197,24,0.10) 0%, transparent 70%)' }}
        />

        <AnimatePresence mode="wait" initial={false}>
          {step === 'otp' ? (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <AdminOtpStep
                email={email}
                onVerified={() => router.push('/admin/dashboard')}
                onBack={() => setStep('credentials')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={fieldVariants}
                className="relative mb-6 flex flex-col items-center text-center"
              >
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #F5C518 0%, #FFD84D 40%, #FF9F1C 100%)',
                    boxShadow: '0 8px 32px rgba(245,197,24,0.28), 0 2px 8px rgba(245,197,24,0.18), 0 0 0 1px rgba(245,197,24,0.22)',
                  }}
                >
                  <ChefHat size={23} strokeWidth={2} color="#1A1A1A" />
                </div>
                <h1 className="font-heading text-xl font-bold text-white">
                  Cook<span style={{ color: '#F5C518' }}>Reels</span>
                </h1>
                <div
                  className="mt-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: 'rgba(245,197,24,0.10)', border: '1px solid rgba(245,197,24,0.22)', color: '#F5C518' }}
                >
                  Admin Portal
                </div>
                <p className="mt-2.5 text-sm" style={{ color: 'rgba(161,161,170,0.90)' }}>
                  Sign in to manage the platform
                </p>
              </motion.div>

              {serverError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-5 flex items-start gap-2.5 rounded-xl p-3.5 text-sm"
                  style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)', color: '#F87171' }}
                >
                  <AlertCircle size={16} strokeWidth={2} className="mt-0.5 flex-shrink-0" />
                  <span>{serverError}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div custom={1} initial="hidden" animate="visible" variants={fieldVariants}>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(245,245,245,0.75)' }}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={15} strokeWidth={1.9} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@cookreels.com"
                      className="w-full rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-white/30 transition-all duration-200 hover:border-[#F5C518]/45 focus:border-[#F5C518]/70 focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', caretColor: '#F5C518' }}
                    />
                  </div>
                </motion.div>

                <motion.div custom={2} initial="hidden" animate="visible" variants={fieldVariants}>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(245,245,245,0.75)' }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={15} strokeWidth={1.9} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-xl py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-white/30 transition-all duration-200 hover:border-[#F5C518]/45 focus:border-[#F5C518]/70 focus:outline-none focus:ring-2 focus:ring-[#F5C518]/20"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', caretColor: '#F5C518' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-white/30 transition-colors hover:text-white/65"
                    >
                      {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                    </button>
                  </div>
                </motion.div>

                <motion.button
                  custom={3}
                  initial="hidden"
                  animate="visible"
                  variants={fieldVariants}
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.01 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-[#1A1A1A] transition-shadow duration-200 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{
                    background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
                    boxShadow: '0 4px 20px rgba(245,197,24,0.40), 0 1px 3px rgba(245,197,24,0.25)',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Sign In'
                  )}
                </motion.button>
              </form>

              <motion.div
                custom={4}
                initial="hidden"
                animate="visible"
                variants={fieldVariants}
                className="mt-5 flex items-center justify-center gap-1.5 text-[11px]"
                style={{ color: 'rgba(255,255,255,0.30)' }}
              >
                <ShieldCheck size={13} strokeWidth={2} style={{ color: 'rgba(245,197,24,0.65)' }} />
                Protected by email verification (2FA)
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
