
import type { Metadata } from 'next'
import SignupClient from './SignupClient'
export const metadata: Metadata = {
  title: 'Sign Up | CookReels',
  description: 'Create your CookReels account and start sharing cooking videos with the world.',
}

export default function Page() {
  
  return <SignupClient />
}
