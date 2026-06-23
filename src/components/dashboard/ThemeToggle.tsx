'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 overflow-hidden"
      style={{
        background: isDark ? 'rgba(43,43,45,0.90)' : 'rgba(255,255,255,0.90)',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        color: isDark ? '#A1A1AA' : '#666666',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.borderColor = 'rgba(245,197,24,0.50)'
        el.style.color = '#F5C518'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.borderColor = isDark ? '#343438' : '#E8E8E8'
        el.style.color = isDark ? '#A1A1AA' : '#666666'
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0,   opacity: 1, scale: 1 }}
            exit={{ rotate: 90,    opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="absolute"
          >
            <Moon size={16} strokeWidth={1.9} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ rotate: 90,  opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0,   opacity: 1, scale: 1 }}
            exit={{ rotate: -90,   opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="absolute"
          >
            <Sun size={16} strokeWidth={1.9} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
