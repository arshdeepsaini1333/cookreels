'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChefHat } from 'lucide-react'

export function GuestBanner() {
  const path = usePathname()
  const next = path ? `?next=${encodeURIComponent(path)}` : ''

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-between gap-3 px-4 py-2.5"
      style={{
        zIndex: 10001,
        background: 'rgba(14,14,14,0.94)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(245,197,24,0.12)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <ChefHat className="w-4.5 h-4.5 flex-shrink-0" style={{ color: '#F5C518' }} />
        <p className="text-white/70 text-xs leading-tight truncate">
          Sign up to like, comment &amp; save
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href={`/auth/login${next}`}
          className="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-white/20 text-white transition-colors hover:bg-white/10"
        >
          Log In
        </Link>
        <Link
          href={`/auth/signup${next}`}
          className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-opacity hover:opacity-90"
          style={{ background: '#F5C518', color: '#1A1A1A' }}
        >
          Sign Up
        </Link>
      </div>
    </div>
  )
}
