'use client'

import { motion } from 'framer-motion'
import { Home, Compass, Film, LayoutGrid, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'

const navItems = [
  { icon: Home,        label: 'Home',       href: '/'           },
  { icon: Compass,     label: 'Explore',    href: '/explore'    },
  { icon: Film,        label: 'Reels',      href: '/reels'      },
  { icon: LayoutGrid,  label: 'Categories', href: '/categories' },
  { icon: Megaphone,   label: 'Boost',      href: '/boost'      },
]

export function BottomNav() {
  const pathname = usePathname()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navRef = useRef<HTMLDivElement>(null)

  // Publish the nav's real rendered height (icon+label sizing, padding, safe-area inset —
  // all content-driven, not a fixed value) as a CSS var so pages that need to fit exactly
  // above it (e.g. MessagesPage) don't have to guess a pixel number that can drift out of
  // sync with this component and leave a gap or an overlap.
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const update = () => document.documentElement.style.setProperty('--bottom-nav-h', `${el.offsetHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Reels page has its own full-screen mobile nav
  if (pathname === '/reels') return null

  return (
    <div
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pb-safe backdrop-blur-2xl"
      style={{
        background: isDark ? 'rgba(30,30,31,0.97)' : 'rgba(247,241,217,0.97)',
        borderTop: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        boxShadow: isDark
          ? '0 -4px 24px rgba(0,0,0,0.45)'
          : '0 -2px 16px rgba(0,0,0,0.06)',
      }}
    >
      {/* Yellow accent line at very top */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/40 to-transparent" />

      <div className="flex items-center justify-around px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.label}
              href={item.href}
              className="relative flex flex-col items-center gap-1 flex-1 py-3 transition-colors duration-200"
            >
              {/* Active top indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#F5C518]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <motion.div
                animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  style={{ color: isActive ? '#F5C518' : isDark ? '#71717A' : '#9CA3AF' }}
                />
              </motion.div>

              <span
                className="text-[10px] font-semibold leading-none"
                style={{ color: isActive ? '#F5C518' : isDark ? '#71717A' : '#9CA3AF' }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
