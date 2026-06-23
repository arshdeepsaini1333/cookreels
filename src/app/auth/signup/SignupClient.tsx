'use client'

import { useRouter } from 'next/navigation'
import SignupPage from '@/components/auth/SignupPage'

export default function SignupClient() {
  const router = useRouter()

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

    if (res.ok) {
      router.push('/')
      return
    }

    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? 'Signup failed. Please try again.')
  }

  return <SignupPage onSubmit={handleSignup} />
}