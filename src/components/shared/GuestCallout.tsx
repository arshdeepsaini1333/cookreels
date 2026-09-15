'use client'

import { motion } from 'framer-motion'
import { Users, MessageCircle, Megaphone } from 'lucide-react'
import { useAuthGuard } from '@/hooks/useAuthGuard'

// Server Components (the page.tsx files that render this) can't pass a component
// reference (like a lucide-react icon) as a prop to a Client Component — only
// plain serializable data crosses that boundary. So callers pass a string key
// and the icon is resolved here, inside the client boundary.
const ICONS = { friends: Users, messages: MessageCircle, boost: Megaphone } as const

interface GuestCalloutProps {
  icon: keyof typeof ICONS
  title: string
  message: string
}

/**
 * Full-width "login to unlock this" card shown in place of session-dependent
 * page content (Friends, Messages, Boost) when there's no logged-in user.
 * The surrounding page shell (sidebar/header) stays exactly as it is for a
 * real user — only this content area changes.
 */
export function GuestCallout({ icon, title, message }: GuestCalloutProps) {
  const { openAuthModal } = useAuthGuard()
  const Icon = ICONS[icon]

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm rounded-[24px] p-8 text-center"
        style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--cr-accent-soft)' }}
        >
          <Icon className="w-7 h-7" style={{ color: 'var(--cr-accent)' }} />
        </div>

        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}>
          {title}
        </h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--cr-text-muted)' }}>
          {message}
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
          >
            Log In
          </button>
          <button
            onClick={() => openAuthModal('signup')}
            className="w-full py-3 rounded-xl text-sm font-semibold border transition-colors"
            style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'transparent' }}
          >
            Sign Up
          </button>
        </div>
      </motion.div>
    </div>
  )
}
