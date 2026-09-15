'use client'

import { motion } from 'framer-motion'
import { ChefHat } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuthGuard } from '@/hooks/useAuthGuard'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * Replaces the logged-in user's ProfileCard in the homepage right rail for
 * guests — same card chrome as the rest of the dashboard, but no real user
 * data is shown (never borrow another user's profile as a stand-in).
 */
export function GuestProfileCard() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { openAuthModal } = useAuthGuard()

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
      className="relative rounded-[24px] overflow-hidden backdrop-blur-xl p-5"
      style={{
        background: isDark ? '#2B2B2D' : '#FFFFFF',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,52,56,0.80)'
          : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.07)',
      }}
    >
      <div
        className="absolute top-0 inset-x-0 h-24"
        style={{ background: 'linear-gradient(160deg, rgba(245,197,24,0.07) 0%, transparent 100%)' }}
      />

      <div className="relative flex flex-col items-center text-center">
        <motion.div
          whileHover={{ scale: 1.06 }}
          className="w-16 h-16 rounded-full mb-3 flex items-center justify-center shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
            boxShadow: `0 8px 24px rgba(245,197,24,0.35), 0 0 0 4px ${isDark ? '#2B2B2D' : '#FFFFFF'}`,
          }}
        >
          <ChefHat size={28} className="text-[#1A1A1A]" strokeWidth={1.8} />
        </motion.div>

        <h3 className="text-sm font-black" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
          Welcome to CookReels
        </h3>
        <p className="text-xs mt-1.5 mb-4 leading-relaxed" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
          Discover recipes, watch reels, and connect with food lovers.
        </p>

        <div className="flex flex-col gap-2 w-full">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openAuthModal('login')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A' }}
          >
            Log In
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openAuthModal('signup')}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold border"
            style={{
              borderColor: isDark ? '#343438' : '#E8E8E8',
              color: isDark ? '#F5F5F5' : '#1A1A1A',
              background: 'transparent',
            }}
          >
            Sign Up
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
