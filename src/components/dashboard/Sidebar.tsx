'use client'

import { motion } from 'framer-motion'
import {
  Home, Compass, Film, Users, MessageCircle,
  LayoutGrid, Megaphone,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { useTheme } from '@/context/ThemeContext'
import { UserAvatar } from '@/components/shared/UserAvatar'

const UNREAD_POLL = 30_000

const navItems = [
  { icon: Home,          label: 'Home',       href: '/',           },
  { icon: Compass,       label: 'Explore',    href: '/explore',    },
  { icon: Film,          label: 'CookReels',  href: '/reels',      },
  { icon: LayoutGrid,    label: 'Categories', href: '/categories', },
  { icon: Users,         label: 'Friends',    href: '/friends',    },
  { icon: MessageCircle, label: 'Messages',   href: '/messages',   },
  { icon: Megaphone,     label: 'Boost',      href: '/boost',      },
]

interface SidebarProps {
  username?: string
}

export function Sidebar({ username = 'Chef' }: SidebarProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

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

  const [unreadMessages, setUnreadMessages] = useState(0)

  const fetchUnread = useCallback(() => {
    fetch('/api/messages/unread-count')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setUnreadMessages(d.count ?? 0) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchUnread()
    const id = setInterval(fetchUnread, UNREAD_POLL)
    return () => clearInterval(id)
  }, [fetchUnread])

  const avatarSrc  = me?.profileImage ?? null
  const avatarName = me ? `${me.firstName} ${me.lastName}` : username

  const isProfilePage = pathname === '/profile' || pathname.startsWith('/profile/')
  const active = isProfilePage
    ? null
    : (navItems.find(item =>
        item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
      )?.label ?? 'Home')

  return (
    <>
      {/* Sidebar panel — desktop only */}
      <aside className="hidden lg:flex lg:relative z-40 h-full w-64 xl:w-72 flex-shrink-0 flex-col">
        {/* Glass panel */}
        <div
          className="absolute inset-0 backdrop-blur-2xl"
          style={{
            background: isDark ? 'rgba(30,30,31,0.95)' : 'rgba(247,241,217,0.97)',
            borderRight: `1px solid ${isDark ? '#343438' : 'rgba(232,232,232,0.60)'}`,
            boxShadow: isDark
              ? '4px 0 24px rgba(0,0,0,0.40)'
              : '4px 0 16px rgba(0,0,0,0.05)',
          }}
        />

        {/* Inner gradient depth */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 inset-x-0 h-48"
            style={{ background: 'linear-gradient(180deg, rgba(245,197,24,0.04) 0%, transparent 100%)' }}
          />
          <div
            className="absolute bottom-0 inset-x-0 h-32"
            style={{ background: 'linear-gradient(0deg, rgba(245,197,24,0.03) 0%, transparent 100%)' }}
          />
        </div>

        <div className="relative flex flex-col h-full">
          {/* ── Logo ── */}
          <div className="px-5 py-3 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isDark ? '/images/cookreels_ligt_logo.png' : '/images/cookreels_logo.png'}
              alt="CookReels"
              className="w-full max-h-9 object-contain object-left"
            />
          </div>

          {/* Divider */}
          <div className="mx-5 h-px" style={{ background: isDark ? '#343438' : 'rgba(232,232,232,0.80)' }} />

          {/* ── Navigation ── */}
          <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto scrollbar-none">
            <p
              className="px-3 mb-3 text-[9px] font-bold tracking-[0.18em] uppercase"
              style={{ color: isDark ? '#52525B' : '#9CA3AF' }}
            >
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = active === item.label
              return (
                <motion.div
                  key={item.label}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                >
                  <Link
                    href={item.href}
                    className={[
                      'relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 group',
                      isActive ? 'text-[#1A1A1A]' : '',
                    ].join(' ')}
                    style={!isActive ? { color: isDark ? '#A1A1AA' : '#666666' } : {}}
                    onMouseEnter={e => {
                      if (!isActive) {
                        const el = e.currentTarget as HTMLAnchorElement
                        el.style.background = isDark ? 'rgba(52,52,56,0.50)' : 'rgba(245,197,24,0.08)'
                        el.style.color = isDark ? '#F5F5F5' : '#1A1A1A'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        const el = e.currentTarget as HTMLAnchorElement
                        el.style.background = 'transparent'
                        el.style.color = isDark ? '#A1A1AA' : '#666666'
                      }
                    }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-bg"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
                          boxShadow: '0 4px 16px rgba(245,197,24,0.32), 0 1px 3px rgba(245,197,24,0.18)',
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}

                    <motion.span
                      animate={{ scale: isActive ? 1.08 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="relative flex-shrink-0"
                    >
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.2 : 1.8}
                        className={isActive ? 'text-[#1A1A1A]' : ''}
                        style={!isActive ? { color: isDark ? '#71717A' : '#9CA3AF' } : {}}
                      />
                    </motion.span>

                    <span className="relative text-sm font-semibold">{item.label}</span>

                    {item.label === 'Messages' && unreadMessages > 0 && !isActive && (
                      <span
                        className="relative ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                        style={{ background: '#F5C518', color: '#1A1A1A' }}
                      >
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}

                    {isActive && (
                      <motion.div
                        layoutId="sidebar-dot"
                        className="relative ml-auto w-1.5 h-1.5 rounded-full bg-[#1A1A1A]/40"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* Divider */}
          <div className="mx-5 h-px" style={{ background: isDark ? '#343438' : 'rgba(232,232,232,0.80)' }} />

          {/* ── Bottom section ── */}
          <div className="p-3 pb-5 space-y-1.5">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl">
              <span className="text-xs font-medium flex-1" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
                Appearance
              </span>
              <ThemeToggle />
            </div>

            <div className="h-px my-1" style={{ background: isDark ? '#343438' : 'rgba(232,232,232,0.80)' }} />

            <Link href="/profile">
              <motion.div
                whileHover={{ x: isProfilePage ? 0 : 2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors duration-200 group"
                style={isProfilePage ? { background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)' } : {}}
                onMouseEnter={e => {
                  if (isProfilePage) return
                  const el = e.currentTarget as HTMLDivElement
                  el.style.background = isDark ? 'rgba(52,52,56,0.50)' : 'rgba(245,197,24,0.08)'
                }}
                onMouseLeave={e => {
                  if (isProfilePage) return
                  const el = e.currentTarget as HTMLDivElement
                  el.style.background = 'transparent'
                }}
              >
                <div className="relative flex-shrink-0">
                  <UserAvatar
                    src={avatarSrc}
                    name={avatarName}
                    size="md"
                    loading="eager"
                    className="ring-2 ring-[#F5C518]/35"
                  />
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#7DBB91] rounded-full border-2"
                    style={{ borderColor: isDark ? '#1E1E1F' : '#F7F1D9' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: isProfilePage ? '#1A1A1A' : isDark ? '#F5F5F5' : '#1A1A1A' }}>
                    {username}
                  </p>
                  <p className="text-xs truncate" style={{ color: isProfilePage ? '#1A1A1A99' : isDark ? '#71717A' : '#9CA3AF' }}>
                    View Profile
                  </p>
                </div>
              </motion.div>
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
