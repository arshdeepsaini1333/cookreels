'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ChefHat, ArrowLeft, Search } from 'lucide-react'

export default function UserNotFound() {
  const router = useRouter()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 text-center"
      style={{ background: 'var(--cr-bg-surface)' }}
    >
      {/* Animated emoji */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="text-7xl mb-6 select-none"
      >
        🔍
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="w-full max-w-md rounded-3xl p-8"
        style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
      >
        {/* Logo mark */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)' }}
        >
          <ChefHat className="w-7 h-7" style={{ color: '#1A1A1A' }} />
        </div>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--cr-text-1)' }}
        >
          User not found
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--cr-text-muted)' }}>
          The profile you're looking for doesn't exist, may have been removed,
          or the username might have changed.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.back()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border transition-colors"
            style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-surface)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/explore')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold shadow-md"
            style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
          >
            <Search className="w-4 h-4" />
            Explore chefs
          </motion.button>
        </div>
      </motion.div>

      {/* Subtle brand footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 text-xs"
        style={{ color: 'var(--cr-text-muted)' }}
      >
        CookReels — Where chefs share their passion
      </motion.p>
    </div>
  )
}
