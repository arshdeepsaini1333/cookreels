'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignupPage from '@/components/auth/SignupPage'
import OtpModal from '@/components/auth/OtpModal'

type OtpState = { show: true; email: string; message: string } | { show: false }

export default function SignupClient() {
  const router = useRouter()
  const [otpState, setOtpState] = useState<OtpState>({ show: false })
  const [nextUrl, setNextUrl] = useState('/')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next')
    if (next) setNextUrl(next)
  }, [])

  const handleSignup = async (data: {
    firstName: string
    lastName: string
    username: string
    email: string
    phone: string
    password: string
  }) => {
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

    router.push(nextUrl)
  }

  return (
    <>
      <SignupPage onSubmit={handleSignup} />
      {otpState.show && (
        <OtpModal
          email={otpState.email}
          message={otpState.message}
          onSuccess={() => router.push(nextUrl)}
          onClose={() => setOtpState({ show: false })}
        />
      )}
    </>
  )
}
