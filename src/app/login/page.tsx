import type { Metadata } from 'next'
import LoginPage from '@/components/auth/LoginPage'

export const metadata: Metadata = {
  title: 'Login | CookReels',
  description: 'Sign in to your CookReels account and continue your culinary journey.',
}

export default function Page() {
  return <LoginPage />
}
