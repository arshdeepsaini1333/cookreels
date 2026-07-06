'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, LogOut, ChevronDown, Menu } from 'lucide-react'
import { ThemeToggle } from '@/components/dashboard/ThemeToggle'
import type { AdminSessionPayload } from '@/lib/admin/session'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CAMPAIGN_MANAGER: 'Campaign Manager',
  MODERATOR: 'Moderator',
  ANALYST: 'Analyst',
  SUPPORT: 'Support',
}

interface AdminTopNavProps {
  admin: AdminSessionPayload
  onOpenSidebar: () => void
}

export function AdminTopNav({ admin, onOpenSidebar }: AdminTopNavProps) {
  const router = useRouter()
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setProfileOpen(false)
    await fetch('/api/admin/auth/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <header
      className="sticky top-0 z-20 flex h-16 flex-shrink-0 items-center gap-3 border-b px-4 sm:px-6"
      style={{ background: 'var(--cr-bg-header)', borderColor: 'var(--cr-border)' }}
    >
      <button
        onClick={onOpenSidebar}
        aria-label="Open menu"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border transition-colors lg:hidden"
        style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-2)' }}
      >
        <Menu size={17} strokeWidth={1.9} />
      </button>

      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search
          size={15}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cr-text-muted)]"
        />
        <input
          type="text"
          placeholder="Search users, campaigns, recipes…"
          disabled
          className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm placeholder:text-[var(--cr-text-muted)] disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)', color: 'var(--cr-text-1)' }}
        />
      </div>

      <div className="flex flex-1 sm:hidden" />

      <div className="flex flex-shrink-0 items-center gap-2">
        <ThemeToggle />

        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors"
          style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-2)' }}
        >
          <Bell size={16} strokeWidth={1.9} />
        </button>

        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="flex items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-2.5 transition-colors"
            style={{ borderColor: 'var(--cr-border)' }}
          >
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold"
              style={{ background: 'var(--cr-accent)', color: 'var(--cr-btn-text)' }}
            >
              {admin.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight text-[var(--cr-text-1)]">{admin.name}</p>
              <p className="text-[10px] leading-tight text-[var(--cr-text-muted)]">
                {ROLE_LABELS[admin.role] ?? admin.role}
              </p>
            </div>
            <ChevronDown size={14} strokeWidth={2} className="text-[var(--cr-text-muted)]" />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border shadow-premium-hover"
              style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
            >
              <div className="border-b px-3.5 py-3" style={{ borderColor: 'var(--cr-border)' }}>
                <p className="truncate text-xs font-bold text-[var(--cr-text-1)]">{admin.email}</p>
                <p className="mt-0.5 text-[11px] text-[var(--cr-text-muted)]">{ROLE_LABELS[admin.role] ?? admin.role}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10 dark:text-red-400"
                >
                  <LogOut size={15} strokeWidth={1.8} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
