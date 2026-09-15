'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChefHat } from 'lucide-react'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import OtpModal from './OtpModal'
import { useAuthModalContext } from '@/context/AuthModalContext'

type SignupData = {
  firstName: string
  lastName: string
  username: string
  email: string
  phone: string
  password: string
}

/**
 * The single, centralized login/signup modal used everywhere a guest attempts
 * an action that requires an account. Reuses the existing LoginForm/SignupForm/
 * OtpModal — no separate auth business logic — and never navigates the guest
 * away from whatever page they were on.
 */
export function AuthModal() {
  const router = useRouter()
  const { isOpen, mode, close, switchMode, handleSuccess } = useAuthModalContext()
  const [otpState, setOtpState] = useState<{ show: true; email: string; message: string } | { show: false }>({ show: false })

  function finish() {
    handleSuccess()
    router.refresh()
  }

  async function handleSignup(data: SignupData) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const body = await res.json().catch(() => ({})) as {
      requiresVerification?: boolean
      email?: string
      message?: string
    }

    if (!res.ok) {
      throw new Error(body.message ?? 'Signup failed. Please try again.')
    }

    if (body.requiresVerification && body.email) {
      setOtpState({ show: true, email: body.email, message: body.message ?? '' })
      return
    }

    finish()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="auth-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              style={{ zIndex: 10200 }}
              onClick={close}
            />

            <motion.div
              key="auth-modal"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
              style={{ zIndex: 10201 }}
              aria-modal="true"
              role="dialog"
              aria-label={mode === 'login' ? 'Log in to CookReels' : 'Sign up for CookReels'}
            >
              <div
                className={`relative w-full my-auto ${mode === 'login' ? 'max-w-md' : 'max-w-2xl'} mx-auto`}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <ChefHat className="w-5 h-5 flex-shrink-0" style={{ color: '#F5C518' }} />
                  <span className="text-sm font-bold text-white/90">
                    {mode === 'login' ? 'Log in to CookReels' : 'Join CookReels'}
                  </span>
                </div>

                <div className="relative">
                  <button
                    onClick={close}
                    className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(30,30,31,0.92)', color: '#F5F5F5', border: '1px solid rgba(255,255,255,0.15)' }}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {mode === 'login' ? (
                    <LoginForm onSuccess={finish} hideAltLink />
                  ) : (
                    <SignupForm onSubmit={handleSignup} hideAltLink />
                  )}
                </div>

                <p className="mt-4 text-center text-sm text-white/70">
                  {mode === 'login' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="font-bold"
                        style={{ color: '#F5C518' }}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="font-bold"
                        style={{ color: '#F5C518' }}
                      >
                        Log in
                      </button>
                    </>
                  )}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {otpState.show && (
        <OtpModal
          email={otpState.email}
          message={otpState.message}
          onSuccess={finish}
          onClose={() => setOtpState({ show: false })}
        />
      )}
    </>,
    document.body,
  )
}
