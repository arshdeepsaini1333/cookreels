'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Settings, LogOut, UserCircle, MessageCircle, Users, Search } from 'lucide-react'
import { useRef, useState, useEffect, useCallback } from 'react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from './GlobalSearch'
import { useTheme } from '@/context/ThemeContext'
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'

interface HeaderProps {
  username?: string
  avatarUrl?: string
}

export function Header({
  username = 'Chef',
  avatarUrl,
}: HeaderProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const mobileDropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const { unreadCount } = useUnreadNotifications()

  const [me, setMe] = useState<{ firstName: string; lastName: string; profileImage: string | null } | null>(null)

  useEffect(() => {
    // Populate from cache first so avatar appears immediately after hydration
    try {
      const cached = JSON.parse(localStorage.getItem('cr:me') ?? 'null')
      if (cached?.firstName) setMe(cached)
    } catch {}

    // Then fetch fresh data from server
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.firstName) {
          setMe(d)
          localStorage.setItem('cr:me', JSON.stringify(d))
        }
      })
      .catch(() => {})
  }, [])

  // Keep avatar in sync when user uploads a new profile photo
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail.url
      setMe(prev => {
        const next = prev ? { ...prev, profileImage: url } : prev
        if (next) localStorage.setItem('cr:me', JSON.stringify(next))
        return next
      })
    }
    window.addEventListener('cr:avatar-updated', handler)
    return () => window.removeEventListener('cr:avatar-updated', handler)
  }, [])

  const avatarSrc  = me?.profileImage ?? avatarUrl ?? null
  const avatarName = me ? `${me.firstName} ${me.lastName}` : username

  async function handleLogout() {
    setProfileOpen(false)
    setMobileProfileOpen(false)
    localStorage.removeItem('cr:me')
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
  }

  const fetchUnreadMessages = useCallback(() => {
    fetch('/api/messages/unread-count')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setUnreadMessages(data.count ?? 0) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchUnreadMessages()
    const id = setInterval(fetchUnreadMessages, 30_000)
    return () => clearInterval(id)
  }, [fetchUnreadMessages])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
      if (mobileDropdownRef.current && !mobileDropdownRef.current.contains(e.target as Node)) {
        setMobileProfileOpen(false)
      }
      // Notification panel is portaled to document.body (see NotificationDropdown),
      // so it isn't a DOM descendant of notifRef — it handles its own outside-click
      // close internally. A check here would incorrectly treat every click inside
      // the portaled panel as "outside" and close it immediately.
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-20 backdrop-blur-2xl border-b shadow-sm"
      style={{
        background: isDark ? 'rgba(30,30,31,0.90)' : 'rgba(245,245,245,0.92)',
        borderBottomColor: isDark ? '#343438' : '#E8E8E8',
        boxShadow: isDark
          ? '0 1px 0 rgba(52,52,56,0.80), 0 4px 24px rgba(0,0,0,0.30)'
          : '0 1px 0 rgba(232,232,232,0.90), 0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Warm ambient line at very top */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/35 to-transparent pointer-events-none" />

      {/* Main row */}
      <div className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 h-16 min-w-0">

        {/* Left: Search bar — visible sm+, hidden on mobile */}
        <div className="hidden sm:flex flex-1 min-w-0 ml-0 lg:ml-0">
          <GlobalSearch variant="desktop" currentUserAvatar={avatarUrl} currentUserName={username} />
        </div>

        {/* Mobile: Search button — leftmost, in place of the old spacer */}
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Search"
          onClick={() => setMobileSearchOpen(true)}
          className="sm:hidden relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            background: isDark ? 'rgba(245,197,24,0.12)' : 'rgba(245,197,24,0.10)',
            border: '1px solid rgba(245,197,24,0.35)',
            color: '#F5C518',
          }}
        >
          <Search size={16} strokeWidth={2.1} />
        </motion.button>

        {/* Mobile: spacer to push remaining actions right */}
        <div className="sm:hidden flex-1" />

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">

          {/* Mobile: Friends link */}
          <Link
            href="/friends"
            aria-label="Friends"
            className="sm:hidden relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              background: isDark ? 'rgba(43,43,45,0.90)' : 'rgba(255,255,255,0.90)',
              border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
              color: isDark ? '#A1A1AA' : '#666666',
            }}
          >
            <Users size={16} strokeWidth={1.9} />
          </Link>

          {/* Mobile: messages icon */}
          <Link
            href="/messages"
            aria-label="Messages"
            className="sm:hidden relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              background: isDark ? 'rgba(43,43,45,0.90)' : 'rgba(255,255,255,0.90)',
              border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
              color: isDark ? '#A1A1AA' : '#666666',
            }}
          >
            <MessageCircle size={16} strokeWidth={1.9} />
            {unreadMessages > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: '#F5C518', color: '#1A1A1A' }}
              >
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </Link>

          {/* Theme toggle — desktop only */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* ── Notification Bell ── */}
          <div ref={notifRef} className="relative">
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              aria-label="Notifications"
              onClick={() => setNotifOpen(o => !o)}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
              style={{
                background: notifOpen
                  ? isDark ? 'rgba(245,197,24,0.12)' : 'rgba(245,197,24,0.10)'
                  : isDark ? 'rgba(43,43,45,0.90)' : 'rgba(255,255,255,0.90)',
                border: `1px solid ${notifOpen ? 'rgba(245,197,24,0.45)' : isDark ? '#343438' : '#E8E8E8'}`,
                color: notifOpen ? '#F5C518' : isDark ? '#A1A1AA' : '#666666',
              }}
              onMouseEnter={e => {
                if (notifOpen) return
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'rgba(245,197,24,0.45)'
                el.style.color = '#F5C518'
              }}
              onMouseLeave={e => {
                if (notifOpen) return
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = isDark ? '#343438' : '#E8E8E8'
                el.style.color = isDark ? '#A1A1AA' : '#666666'
              }}
            >
              <Bell size={16} strokeWidth={1.9} />

              {/* Unread dot — only shown when there are unread notifications */}
              <AnimatePresence>
                {unreadCount > 0 && (
                  <>
                    {/* Static filled dot */}
                    <motion.span
                      key="dot"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F5C518]"
                    />
                    {/* Pulsing ring */}
                    <motion.span
                      key="pulse"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                      className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F5C518]"
                    />
                  </>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Dropdown */}
            <NotificationDropdown
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              isDark={isDark}
              newNotification={null}
              anchorRef={notifRef}
            />
          </div>

          {/* Avatar + welcome — desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-[11px] leading-tight font-ui" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Welcome back,</p>
              <p className="text-sm font-semibold leading-tight" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{username}</p>
            </div>

            <div ref={dropdownRef} className="relative flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                aria-label="Open profile"
                onClick={() => setProfileOpen(o => !o)}
                className="relative"
              >
                <UserAvatar
                  src={avatarSrc}
                  name={avatarName}
                  size="md"
                  loading="eager"
                  className="ring-2 ring-[#F5C518]/35 hover:ring-[#F5C518]/65 transition-all"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#7DBB91] rounded-full border-2" style={{ borderColor: isDark ? '#1E1E1F' : '#F5F5F5' }} />
              </motion.button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: -8 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2.5 w-52 rounded-2xl backdrop-blur-2xl shadow-2xl overflow-hidden z-50"
                    style={{
                      background: isDark ? 'rgba(43,43,45,0.97)' : 'rgba(255,255,255,0.97)',
                      border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                      boxShadow: isDark
                        ? '0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(52,52,56,0.80)'
                        : '0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(232,232,232,0.90)',
                    }}
                  >
                    <div className="h-[2px] bg-gradient-to-r from-[#F5C518] to-[#FF9F1C]" />
                    <div className="px-4 py-3 border-b" style={{ borderColor: isDark ? '#343438' : '#E8E8E8' }}>
                      <p className="text-xs font-bold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{username}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Passionate home cook</p>
                    </div>
                    <div className="p-1.5">
                      {[
                        { icon: UserCircle, label: 'View Profile', href: '/profile' },
                        { icon: Settings,   label: 'Settings',     href: '/profile' },
                      ].map(({ icon: Icon, label, href }) => (
                        <a
                          key={label}
                          href={href}
                          onClick={(e) => {
                            setProfileOpen(false)
                            if (label === 'Settings') {
                              e.preventDefault()
                              sessionStorage.setItem('cr:open-settings', '1')
                              router.push('/profile')
                            }
                          }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
                          style={{ color: isDark ? '#A1A1AA' : '#666666' }}
                          onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = isDark ? 'rgba(52,52,56,0.60)' : '#FFF3BF'; el.style.color = '#F5C518' }}
                          onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'transparent'; el.style.color = isDark ? '#A1A1AA' : '#666666' }}
                        >
                          <Icon size={15} strokeWidth={1.8} />
                          {label}
                        </a>
                      ))}
                      <div className="my-1 mx-2 h-px" style={{ background: isDark ? '#343438' : '#E8E8E8' }} />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150 font-medium"
                      >
                        <LogOut size={15} strokeWidth={1.8} />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile: avatar with profile dropdown */}
          <div ref={mobileDropdownRef} className="sm:hidden relative">
            <motion.button
              whileTap={{ scale: 0.92 }}
              aria-label="Open profile"
              onClick={() => setMobileProfileOpen(o => !o)}
              className="relative"
            >
              <UserAvatar
                src={avatarSrc}
                name={avatarName}
                size="sm"
                loading="eager"
                className="ring-2 ring-[#F5C518]/35"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#7DBB91] rounded-full border-2" style={{ borderColor: isDark ? '#1E1E1F' : '#F5F5F5' }} />
            </motion.button>

            <AnimatePresence>
              {mobileProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -8 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 mt-2.5 w-52 rounded-2xl backdrop-blur-2xl shadow-2xl overflow-hidden z-50"
                  style={{
                    background: isDark ? 'rgba(43,43,45,0.97)' : 'rgba(255,255,255,0.97)',
                    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                    boxShadow: isDark
                      ? '0 16px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(52,52,56,0.80)'
                      : '0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(232,232,232,0.90)',
                  }}
                >
                  <div className="h-[2px] bg-gradient-to-r from-[#F5C518] to-[#FF9F1C]" />
                  <div className="px-4 py-3 border-b" style={{ borderColor: isDark ? '#343438' : '#E8E8E8' }}>
                    <p className="text-xs font-bold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>{username}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Passionate home cook</p>
                  </div>
                  <div className="p-1.5">
                    {[
                      { icon: UserCircle, label: 'View Profile', href: '/profile' },
                      { icon: Settings,   label: 'Settings',     href: '/profile' },
                    ].map(({ icon: Icon, label, href }) => (
                      <a
                        key={label}
                        href={href}
                        onClick={(e) => {
                          setMobileProfileOpen(false)
                          if (label === 'Settings') {
                            e.preventDefault()
                            sessionStorage.setItem('cr:open-settings', '1')
                            router.push('/profile')
                          }
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
                        style={{ color: isDark ? '#A1A1AA' : '#666666' }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = isDark ? 'rgba(52,52,56,0.60)' : '#FFF3BF'; el.style.color = '#F5C518' }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'transparent'; el.style.color = isDark ? '#A1A1AA' : '#666666' }}
                      >
                        <Icon size={15} strokeWidth={1.8} />
                        {label}
                      </a>
                    ))}
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl">
                      <span className="text-sm font-medium" style={{ color: isDark ? '#A1A1AA' : '#666666' }}>Appearance</span>
                      <ThemeToggle />
                    </div>
                    <div className="my-1 mx-2 h-px" style={{ background: isDark ? '#343438' : '#E8E8E8' }} />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150 font-medium"
                    >
                      <LogOut size={15} strokeWidth={1.8} />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {mobileSearchOpen && (
          <GlobalSearch
            variant="mobile"
            onClose={() => setMobileSearchOpen(false)}
            currentUserAvatar={avatarUrl}
            currentUserName={username}
          />
        )}
      </AnimatePresence>
    </motion.header>
  )
}
