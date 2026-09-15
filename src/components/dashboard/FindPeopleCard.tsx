'use client'

import { motion } from 'framer-motion'
import { Users, ChefHat } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuthGuard } from '@/hooks/useAuthGuard'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * Guest-only encouragement card for the Explore sidebar, shown below
 * GuestProfileCard — nudges signup by highlighting the social side of
 * CookReels (following friends and chefs) rather than repeating the plain
 * login pitch.
 */
export function FindPeopleCard() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { openAuthModal } = useAuthGuard()

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay: 0.22, ease: EASE }}
      className="relative rounded-[24px] overflow-hidden p-5"
      style={{
        background: isDark ? '#2B2B2D' : '#FFFFFF',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,52,56,0.80)'
          : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.07)',
      }}
    >
      <div className="flex items-center -space-x-2 mb-3.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center z-10"
          style={{ background: 'rgba(125,187,145,0.16)', border: `2px solid ${isDark ? '#2B2B2D' : '#FFFFFF'}` }}
        >
          <Users size={16} style={{ color: '#7DBB91' }} />
        </div>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(245,197,24,0.16)', border: `2px solid ${isDark ? '#2B2B2D' : '#FFFFFF'}` }}
        >
          <ChefHat size={16} style={{ color: '#F5C518' }} />
        </div>
      </div>

      <h3 className="text-sm font-black mb-1.5" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
        Find Friends &amp; Chefs
      </h3>
      <p className="text-xs leading-relaxed mb-4" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
        Sign up to follow home cooks and professional chefs, and fill your feed with recipes you&apos;ll actually love.
      </p>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => openAuthModal('signup')}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold"
        style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A' }}
      >
        Sign Up Free
      </motion.button>
    </motion.div>
  )
}
