'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Play, Heart, Star, Clock, Bookmark, ArrowRight,
  ChefHat, Flame, Quote, Plus, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { AddContentModal } from '@/components/shared/AddContentModal'
import { RecipeViewerModal } from '@/components/shared/RecipeViewerModal'
import { ReelThumbnail } from '@/components/shared/ReelThumbnail'
import type { ProfileRecipe, ProfileUser } from '@/components/profile/ProfilePage'

/* ─── Types ───────────────────────────────────────────────── */

interface ProfileStats {
  posts: number
  followers: number
  following: number
}

interface DashboardCardsProps {
  username?: string
  userId?: string
  currentUserAvatar?: string | null
  profileStats?: ProfileStats
}

/* ─── Animation presets ───────────────────────────────────── */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const heroItem = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: EASE, delay },
})

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const cardReveal = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26 },
  },
}

/* ─── Data ────────────────────────────────────────────────── */

const trendingReels = [
  {
    id: 1, title: 'Butter Chicken Masala', creator: 'Arjun S.', likes: '48.2k', duration: '0:58',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
    gradient: 'from-orange-600 to-rose-600',
  },
  {
    id: 2, title: 'Hyderabadi Dum Biryani', creator: 'Priya M.', likes: '31.5k', duration: '1:12',
    image: 'https://images.unsplash.com/photo-1542367592-8849eb950fd8?w=400&q=80',
    gradient: 'from-amber-500 to-orange-700',
  },
  {
    id: 3, title: 'Alphonso Mango Lassi', creator: 'Kavitha R.', likes: '27.3k', duration: '0:45',
    image: 'https://images.unsplash.com/photo-1606471191009-63994c53433b?w=400&q=80',
    gradient: 'from-pink-400 to-fuchsia-600',
  },
  {
    id: 4, title: 'Tandoori Raan Masterclass', creator: 'Rohit V.', likes: '19.8k', duration: '2:03',
    image: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=400&q=80',
    gradient: 'from-red-600 to-rose-700',
  },
  {
    id: 5, title: 'Dal Makhani Dhaba Style', creator: 'Meera K.', likes: '14.1k', duration: '1:30',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
    gradient: 'from-emerald-500 to-teal-700',
  },
  {
    id: 6, title: 'Crispy Masala Dosa', creator: 'Ananya I.', likes: '22.6k', duration: '0:55',
    image: 'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=400&q=80',
    gradient: 'from-yellow-500 to-amber-600',
  },
]

const categories = [
  { id: 1, name: 'Breakfast',   emoji: '☀️', gradient: 'from-amber-400 to-orange-500',    shadow: 'shadow-amber-400/35'  },
  { id: 2, name: 'Desserts',    emoji: '🍰', gradient: 'from-pink-400 to-rose-500',        shadow: 'shadow-pink-400/35'   },
  { id: 3, name: 'Shakes',      emoji: '🥤', gradient: 'from-cyan-400 to-blue-500',        shadow: 'shadow-cyan-400/35'   },
  { id: 4, name: 'Dinner',      emoji: '🍽️', gradient: 'from-violet-500 to-purple-600',    shadow: 'shadow-violet-400/35' },
  { id: 5, name: 'Spicy',       emoji: '🌶️', gradient: 'from-red-500 to-rose-600',         shadow: 'shadow-red-400/35'    },
  { id: 6, name: 'Snacks',      emoji: '🍿', gradient: 'from-yellow-400 to-amber-500',     shadow: 'shadow-yellow-400/35' },
  { id: 7, name: 'Healthy',     emoji: '🥗', gradient: 'from-green-400 to-emerald-600',    shadow: 'shadow-green-400/35'  },
  { id: 8, name: 'Street Food', emoji: '🌮', gradient: 'from-orange-400 to-amber-600',     shadow: 'shadow-orange-400/35' },
  { id: 9, name: 'Italian',     emoji: '🍕', gradient: 'from-lime-400 to-green-600',       shadow: 'shadow-lime-400/35'   },
  { id: 10, name: 'Quick',      emoji: '⚡', gradient: 'from-sky-400 to-indigo-500',       shadow: 'shadow-sky-400/35'    },
]

const recommended = [
  {
    id: 1, title: 'Paneer Makhani', desc: 'Velvety tomato-cream sauce with soft cottage cheese & fenugreek',
    time: '35 min', rating: 4.9, creator: 'Arjun Sharma', saved: false,
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80',
    gradient: 'from-amber-600 via-orange-500 to-yellow-400', tag: 'Punjabi',
  },
  {
    id: 2, title: 'Hyderabadi Dum Biryani', desc: 'Slow-cooked basmati sealed with dough, saffron & caramelised onions',
    time: '90 min', rating: 4.9, creator: 'Rohit Verma', saved: true,
    image: 'https://images.unsplash.com/photo-1542367592-8849eb950fd8?w=600&q=80',
    gradient: 'from-orange-500 via-amber-400 to-yellow-300', tag: 'Hyderabadi',
  },
  {
    id: 3, title: 'Alphonso Mango Lassi', desc: 'Chilled Alphonso mango blended with hung curd & cardamom',
    time: '10 min', rating: 4.7, creator: 'Priya Mehta', saved: false,
    image: 'https://images.unsplash.com/photo-1606471191009-63994c53433b?w=600&q=80',
    gradient: 'from-yellow-400 via-amber-300 to-orange-300', tag: 'Drinks',
  },
  {
    id: 4, title: 'Chettinad Chicken Curry', desc: 'Fiery South Indian curry with freshly stone-ground spices',
    time: '45 min', rating: 4.8, creator: 'Kavitha Reddy', saved: false,
    image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80',
    gradient: 'from-red-600 via-rose-500 to-orange-400', tag: 'South Indian',
  },
  {
    id: 5, title: 'Avocado Poached Toast', desc: 'Sourdough with whipped feta, poached egg & chilli flakes',
    time: '15 min', rating: 4.6, creator: 'Vikram Nair', saved: true,
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80',
    gradient: 'from-amber-500 via-orange-400 to-yellow-300', tag: 'Breakfast',
  },
  {
    id: 6, title: 'Choco Lava Cake', desc: 'Warm chocolate cake with molten centre & vanilla ice cream',
    time: '20 min', rating: 5.0, creator: 'Deepa Patel', saved: false,
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&q=80',
    gradient: 'from-rose-600 via-pink-500 to-fuchsia-400', tag: 'Desserts',
  },
]

const cookingQuotes = [
  'Masala is the soul of Indian cooking.',
  'Every spice carries a thousand-year story.',
  'Good biryani needs patience, not shortcuts.',
  'In India, food is love served on a thali.',
  'The secret? Slow cook and trust the process.',
  'Ghee makes everything better — always.',
]

const quoteImages = [
  'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=480&q=80',
  'https://images.unsplash.com/photo-1542367592-8849eb950fd8?w=480&q=80',
  'https://images.unsplash.com/photo-1517244683847-7456b63c5969?w=480&q=80',
  'https://images.unsplash.com/photo-1606471191009-63994c53433b?w=480&q=80',
  'https://images.unsplash.com/photo-1728910156510-77488f19b152?w=480&q=80',
  'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=480&q=80',
]


const spotlightDishes = [
  { emoji: '🍛', name: 'Butter Chicken', cuisine: 'Punjabi',     time: '40 min', tip: 'Marinate overnight for deep flavour.' },
  { emoji: '🍚', name: 'Dum Biryani',    cuisine: 'Hyderabadi',  time: '90 min', tip: 'Seal the pot with dough — dum is everything.' },
  { emoji: '🥞', name: 'Masala Dosa',   cuisine: 'South Indian', time: '30 min', tip: 'Ferment the batter 12 hrs for the tang.' },
  { emoji: '🫕', name: 'Dal Makhani',   cuisine: 'Punjabi',      time: '6 hrs',  tip: 'Slow cook on a tawa overnight.' },
]

/* ─── Section Title ───────────────────────────────────────── */

function SectionTitle({ label, sub, href }: { label: string; sub?: string; href?: string }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h2
          className="font-heading text-xl sm:text-2xl font-black tracking-tight"
          style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}
        >
          {label}
        </h2>
        {sub && (
          <p className="text-sm mt-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            {sub}
          </p>
        )}
      </div>
      <button
        onClick={() => href && router.push(href)}
        className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
        style={{ color: 'var(--cr-accent)' }}
      >
        See all <ArrowRight size={12} />
      </button>
    </div>
  )
}

/* ─── Hero Section ────────────────────────────────────────── */

function HeroSection({ username, onAddRecipe }: { username: string; onAddRecipe: () => void }) {
  const router = useRouter()
  const [greeting, setGreeting] = useState('Good Morning')
  const [spotIdx, setSpotIdx] = useState(0)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening')
  }, [])

  useEffect(() => {
    const t = setInterval(() => setSpotIdx(i => (i + 1) % spotlightDishes.length), 3200)
    return () => clearInterval(t)
  }, [])

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="relative overflow-hidden rounded-[28px]"
      style={{ minHeight: 220 }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=75)',
        }}
      />
      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/58 to-black/28" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      {/* Warm yellow tint */}
      <div className="absolute inset-0" style={{ background: 'rgba(245,197,24,0.04)' }} />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none dot-grid text-white"
        style={{ backgroundSize: '28px 28px' }}
      />

      {/* Top yellow accent bar */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518]/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-between gap-8 p-6 sm:p-8">
        <div className="flex-1 min-w-0 max-w-lg">
          {/* Greeting pill */}
          <motion.div
            {...heroItem(0)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-5"
          >
            <span className="text-sm">👋</span>
            <span className="text-xs font-semibold text-white/90">
              {greeting}, {username}
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            {...heroItem(0.08)}
            className="font-heading text-3xl sm:text-4xl xl:text-[44px] font-black text-white tracking-tight leading-[1.15]"
          >
            Cook Something{' '}
            <span
              className="animate-gradient-x bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(90deg, #F5C518, #FFD84D, #FF9F1C, #F5C518)',
                backgroundSize: '200% 100%',
              }}
            >
              Amazing
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            {...heroItem(0.15)}
            className="mt-3 text-sm sm:text-base font-medium text-white/60 leading-relaxed"
          >
            Short recipes · Big flavors · Endless inspiration
          </motion.p>

          {/* CTAs */}
          <motion.div {...heroItem(0.22)} className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push('/reels')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-[#1A1A1A] w-full sm:w-auto"
              style={{
                background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)',
                boxShadow: '0 8px 24px rgba(245,197,24,0.40)',
              }}
            >
              <Flame size={15} />
              Explore Reels
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              >
                <ArrowRight size={14} />
              </motion.span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onAddRecipe}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold bg-white/12 text-white border border-white/22 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 w-full sm:w-auto"
            >
              <Plus size={14} />
              Add Recipe
            </motion.button>
          </motion.div>
        </div>

        {/* Recipe Spotlight */}
        <motion.div
          {...heroItem(0.3)}
          className="hidden md:flex flex-col w-44 xl:w-48 flex-shrink-0"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2.5">
            Recipe Spotlight
          </p>

          <div className="relative rounded-2xl overflow-hidden border border-white/12 bg-black/35 backdrop-blur-xl shadow-2xl">
            <div className="h-[2px] w-full bg-gradient-to-r from-[#F5C518] to-[#FF9F1C]" />

            <div className="flex items-center justify-center h-20 bg-gradient-to-b from-white/5 to-transparent text-5xl select-none">
              <AnimatePresence mode="wait">
                <motion.span
                  key={spotIdx + '-emoji'}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {spotlightDishes[spotIdx].emoji}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="px-3 pb-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={spotIdx + '-info'}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <p className="font-heading text-sm font-bold text-white leading-snug">
                    {spotlightDishes[spotIdx].name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F5C518]/20 text-[#F5C518] font-semibold">
                      {spotlightDishes[spotIdx].cuisine}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-medium flex items-center gap-1">
                      <Clock size={9} />
                      {spotlightDishes[spotIdx].time}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 mt-2 leading-relaxed italic">
                    &ldquo;{spotlightDishes[spotIdx].tip}&rdquo;
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {spotlightDishes.map((_, i) => (
              <button
                key={i}
                onClick={() => setSpotIdx(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === spotIdx ? 16 : 5,
                  height: 5,
                  background: i === spotIdx ? '#F5C518' : 'rgba(255,255,255,0.25)',
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}

/* ─── Trending Reels ──────────────────────────────────────── */

const FALLBACK_GRADIENTS = [
  'from-orange-600 to-rose-600',
  'from-amber-500 to-orange-700',
  'from-pink-400 to-fuchsia-600',
  'from-red-600 to-rose-700',
  'from-emerald-500 to-teal-700',
  'from-yellow-500 to-amber-600',
  'from-violet-500 to-purple-700',
  'from-blue-500 to-indigo-700',
]

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(n)
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface TrendingReelItem {
  id: string
  title: string
  likeCount: number
  commentCount: number
  viewCount: number
  duration: number | null
  thumbnailUrl: string | null
  videoUrl: string
  gradient: string | null
  user: { username: string }
  trendingScore: number
}


function TrendingReels() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const scrollRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const router = useRouter()

  const [reels, setReels] = useState<TrendingReelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    fetch('/api/reels/trending')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.reels)) setReels(shuffleArray(data.reels))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 8)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  }, [loading])

  const slide = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' })
  }

  // Mouse drag-to-scroll
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 })

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    drag.current = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft }
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drag.current.active || !scrollRef.current) return
    scrollRef.current.scrollLeft = drag.current.scrollLeft - (e.clientX - drag.current.startX)
  }

  const stopDrag = () => {
    drag.current.active = false
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab'
      scrollRef.current.style.userSelect = ''
    }
  }

  const activeReels = reels.length > 0 ? reels : trendingReels

  return (
    <motion.section
      ref={sectionRef}
      variants={stagger}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      <SectionTitle label="Trending Reels" sub="What the community is watching right now" href="/reels" />

      <div className="relative">
        {/* Left arrow */}
        <AnimatePresence>
          {canScrollLeft && !loading && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => slide('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md"
              style={{
                background: isDark ? 'rgba(43,43,45,0.92)' : 'rgba(255,255,255,0.92)',
                borderColor: isDark ? '#343438' : '#E8E8E8',
                color: isDark ? '#F5F5F5' : '#1A1A1A',
              }}
            >
              <ChevronLeft size={16} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right arrow */}
        <AnimatePresence>
          {canScrollRight && !loading && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => slide('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md"
              style={{
                background: isDark ? 'rgba(43,43,45,0.92)' : 'rgba(255,255,255,0.92)',
                borderColor: isDark ? '#343438' : '#E8E8E8',
                color: isDark ? '#F5F5F5' : '#1A1A1A',
              }}
            >
              <ChevronRight size={16} />
            </motion.button>
          )}
        </AnimatePresence>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-none [scroll-snap-type:x_mandatory] scroll-smooth select-none"
        style={{ cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {loading
          ? Array.from({ length: 6 }, (_, i) => i).map((_, i) => (
            <div
              key={i}
              className="relative flex-shrink-0 w-36 sm:w-40 rounded-[20px] overflow-hidden [scroll-snap-align:start]"
              style={{
                aspectRatio: '9/15',
                background: isDark ? '#2B2B2D' : '#E8E8E8',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))
          : activeReels.map((reel, i) => {
            const isReal = 'user' in reel
            const image = isReal ? (reel as TrendingReelItem).thumbnailUrl : (reel as typeof trendingReels[0]).image
            const gradient = isReal
              ? ((reel as TrendingReelItem).gradient ?? FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length])
              : (reel as typeof trendingReels[0]).gradient
            const creator = isReal ? (reel as TrendingReelItem).user.username : (reel as typeof trendingReels[0]).creator
            const likes = isReal ? fmtNum((reel as TrendingReelItem).likeCount) : (reel as typeof trendingReels[0]).likes
            const duration = isReal ? fmtDuration((reel as TrendingReelItem).duration) : (reel as typeof trendingReels[0]).duration

            return (
              <motion.div
                key={reel.id}
                variants={cardReveal}
                custom={i}
                whileHover={{ y: -7, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                onClick={() => {
                  if (isReal) {
                    router.push(`/reels?reelId=${(reel as TrendingReelItem).id}`)
                  } else {
                    router.push('/reels')
                  }
                }}
                className="relative flex-shrink-0 w-36 sm:w-40 rounded-[20px] overflow-hidden cursor-pointer group [scroll-snap-align:start]"
                style={{
                  aspectRatio: '9/15',
                  boxShadow: isDark
                    ? '0 4px 24px rgba(0,0,0,0.50), 0 0 0 1px rgba(52,52,56,0.70)'
                    : '0 4px 20px rgba(0,0,0,0.12), 0 0 0 1px rgba(232,232,232,0.60)',
                }}
              >
                {isReal && (reel as TrendingReelItem).videoUrl ? (
                  <ReelThumbnail
                    videoUrl={(reel as TrendingReelItem).videoUrl}
                    thumbnailUrl={(reel as TrendingReelItem).thumbnailUrl}
                    imgClassName="transition-transform duration-500 group-hover:scale-110"
                  />
                ) : image ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url(${image})` }}
                  />
                ) : null}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} ${isReal ? 'opacity-0' : image ? 'opacity-40' : 'opacity-90'}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />

                <div className="absolute inset-0 rounded-[20px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />

                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <motion.div
                    initial={{ scale: 0.7 }}
                    whileHover={{ scale: 1 }}
                    className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 flex items-center justify-center"
                  >
                    <Play size={20} className="text-white ml-0.5" fill="white" />
                  </motion.div>
                </div>

                {duration && (
                  <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/45 backdrop-blur-sm text-[9px] text-white font-bold">
                    {duration}
                  </div>
                )}

                <div className="absolute bottom-0 inset-x-0 p-3">
                  <p className="text-xs font-bold text-white leading-tight line-clamp-2 mb-1">{reel.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/65">{creator}</span>
                    <div className="flex items-center gap-1">
                      <Heart size={10} className="text-rose-300" fill="currentColor" />
                      <span className="text-[10px] text-white/75">{likes}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        }
      </div>
      </div>

    </motion.section>
  )
}


/* ─── Recommended For You ─────────────────────────────────── */

const REC_GRADIENTS = [
  'from-amber-600 via-orange-500 to-yellow-400',
  'from-orange-500 via-amber-400 to-yellow-300',
  'from-yellow-400 via-amber-300 to-orange-300',
  'from-red-600 via-rose-500 to-orange-400',
  'from-emerald-500 via-teal-400 to-cyan-400',
  'from-rose-600 via-pink-500 to-fuchsia-400',
  'from-violet-500 via-purple-400 to-indigo-400',
  'from-blue-500 via-sky-400 to-cyan-300',
]

interface RecommendedRecipe {
  id: string
  title: string
  description: string | null
  coverImage: string | null
  cookTime: number | null
  prepTime: number | null
  servings: number | null
  createdAt: string
  avgRating: number
  likeCount: number
  cuisine: string | null
  difficulty: string | null
  isVeg: boolean
  user: {
    id: string
    username: string
    firstName: string
    lastName: string
    profileImage: string | null
    isVerified: boolean
  }
}

function fmtTime(cookTime: number | null, prepTime: number | null): string {
  const total = (cookTime ?? 0) + (prepTime ?? 0)
  if (!total) return '—'
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function RecommendedSection({
  currentUserName,
  currentUserAvatar,
  currentUserId,
}: {
  currentUserName?: string
  currentUserAvatar?: string | null
  currentUserId?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [recipes, setRecipes] = useState<RecommendedRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const [modalOpen, setModalOpen] = useState(false)
  const [modalIndex, setModalIndex] = useState(0)
  const [allProfileRecipes, setAllProfileRecipes] = useState<ProfileRecipe[]>([])
  const [allProfileUsers, setAllProfileUsers] = useState<ProfileUser[]>([])

  const toProfileRecipe = (r: RecommendedRecipe): ProfileRecipe => ({
    id: r.id,
    title: r.title,
    coverImage: r.coverImage,
    cookTime: r.cookTime,
    prepTime: r.prepTime,
    likeCount: r.likeCount,
    difficulty: r.difficulty,
    description: r.description,
    servings: r.servings,
    createdAt: r.createdAt,
  })

  const toProfileUser = (r: RecommendedRecipe): ProfileUser => ({
    id: r.user.id,
    name: `${r.user.firstName} ${r.user.lastName}`.trim(),
    username: r.user.username,
    bio: null,
    verified: r.user.isVerified,
    isOnline: false,
    topChef: false,
    level: 'home',
    avatar: r.user.profileImage,
    cuisineSpecialty: null,
  })

  const openRecipe = (index: number) => {
    setModalIndex(index)
    setModalOpen(true)
  }

  useEffect(() => {
    fetch('/api/recipes/recommended')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.recipes)) {
          const shuffled = shuffleArray(data.recipes) as RecommendedRecipe[]
          setRecipes(shuffled)
          setAllProfileRecipes(shuffled.map(toProfileRecipe))
          setAllProfileUsers(shuffled.map(toProfileUser))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const displayRecipes = loading ? [] : recipes

  return (
    <motion.section
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      <SectionTitle label="Recommended For You" sub="Curated picks based on your taste" />

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="rounded-[24px] overflow-hidden"
              style={{
                background: isDark ? '#2B2B2D' : '#E8E8E8',
                height: 320,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayRecipes.map((recipe, i) => {
            const gradient = REC_GRADIENTS[i % REC_GRADIENTS.length]
            const timeStr  = fmtTime(recipe.cookTime, recipe.prepTime)
            const tag      = recipe.cuisine ?? (recipe.isVeg ? 'Veg' : recipe.difficulty ?? 'Recipe')

            return (
              <motion.article
                key={recipe.id}
                variants={cardReveal}
                custom={i}
                whileHover={{ y: -7 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="group rounded-[24px] overflow-hidden cursor-pointer transition-shadow duration-300"
                onClick={() => openRecipe(i)}
                style={{
                  background: isDark ? '#2B2B2D' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                  boxShadow: isDark
                    ? '0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,52,56,0.80)'
                    : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.07)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = isDark
                    ? '0 8px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(245,197,24,0.18), 0 0 32px rgba(245,197,24,0.06)'
                    : '0 8px 24px rgba(0,0,0,0.09), 0 24px 48px rgba(0,0,0,0.07), 0 0 0 1px rgba(245,197,24,0.12)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = isDark
                    ? '0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,52,56,0.80)'
                    : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.07)'
                }}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  {recipe.coverImage ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${recipe.coverImage})` }}
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-transform duration-500 group-hover:scale-110`} />
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-25`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Tag */}
                  <div className="absolute top-3 left-3">
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full text-[#1A1A1A]"
                      style={{ background: 'rgba(245,197,24,0.90)', backdropFilter: 'blur(8px)' }}
                    >
                      {tag}
                    </span>
                  </div>

                  {/* Save */}
                  <motion.button
                    whileTap={{ scale: 0.86 }}
                    onClick={e => {
                      e.stopPropagation()
                      setSaved(prev => {
                        const next = new Set(prev)
                        next.has(recipe.id) ? next.delete(recipe.id) : next.add(recipe.id)
                        return next
                      })
                    }}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200"
                    style={saved.has(recipe.id)
                      ? { background: '#7DBB91', boxShadow: '0 4px 12px rgba(125,187,145,0.40)' }
                      : { background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)' }
                    }
                  >
                    <Bookmark size={15} className="text-white" fill={saved.has(recipe.id) ? 'currentColor' : 'none'} />
                  </motion.button>

                  {/* Time */}
                  {timeStr !== '—' && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-sm">
                      <Clock size={10} className="text-white/80" />
                      <span className="text-[10px] text-white font-semibold">{timeStr}</span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3
                      className="text-sm font-bold leading-snug line-clamp-1 transition-colors group-hover:text-[#F5C518]"
                      style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}
                    >
                      {recipe.title}
                    </h3>
                    {recipe.avgRating > 0 && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star size={12} style={{ fill: '#F5C518', stroke: '#F5C518' }} />
                        <span className="text-xs font-bold" style={{ color: isDark ? '#A1A1AA' : '#666666' }}>
                          {recipe.avgRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {recipe.description && (
                    <p
                      className="text-xs leading-relaxed line-clamp-2 mb-3"
                      style={{ color: isDark ? '#71717A' : '#9CA3AF' }}
                    >
                      {recipe.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)' }}
                      >
                        <ChefHat size={11} className="text-[#1A1A1A]" />
                      </div>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#A1A1AA' : '#666666' }}>
                        {recipe.user.username}
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={e => { e.stopPropagation(); openRecipe(i) }}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all duration-200"
                      style={{ color: '#F5C518', borderColor: 'rgba(245,197,24,0.28)', background: 'rgba(245,197,24,0.09)' }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background = '#F5C518'
                        el.style.borderColor = '#F5C518'
                        el.style.color = '#1A1A1A'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLButtonElement
                        el.style.background = 'rgba(245,197,24,0.09)'
                        el.style.borderColor = 'rgba(245,197,24,0.28)'
                        el.style.color = '#F5C518'
                      }}
                    >
                      View Recipe
                    </motion.button>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      )}

      {modalOpen && allProfileRecipes.length > 0 && allProfileUsers.length > 0 && (
        <RecipeViewerModal
          recipes={allProfileRecipes}
          initialIndex={modalIndex}
          user={allProfileUsers[0]}
          users={allProfileUsers}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          currentUserAvatar={currentUserAvatar}
          currentUserName={currentUserName}
          currentUserId={currentUserId}
        />
      )}
    </motion.section>
  )
}

/* ─── Profile Card ────────────────────────────────────────── */

function ProfileCard({ username, stats }: { username: string; stats?: { posts: number; followers: number; following: number } }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
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
      {/* Header accent */}
      <div
        className="absolute top-0 inset-x-0 h-24"
        style={{ background: 'linear-gradient(160deg, rgba(245,197,24,0.07) 0%, transparent 100%)' }}
      />

      <div className="relative flex flex-col items-center text-center">
        {/* Avatar */}
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
          {username}
        </h3>
        <p className="text-xs mt-0.5 mb-4" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
          Passionate home cook ✨
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 w-full mb-4">
          {[
            { val: fmtNum(stats?.posts     ?? 0), label: 'Posts' },
            { val: fmtNum(stats?.followers ?? 0), label: 'Followers' },
            { val: fmtNum(stats?.following ?? 0), label: 'Following' },
          ].map(({ val, label }) => (
            <div
              key={label}
              className="flex flex-col items-center p-2 rounded-xl"
              style={{
                background: isDark ? 'rgba(52,52,56,0.50)' : '#FFF3BF',
                border: `1px solid ${isDark ? '#343438' : 'rgba(245,197,24,0.18)'}`,
              }}
            >
              <span className="text-sm font-black" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
                {val}
              </span>
              <span className="text-[10px]" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* View profile */}
        <Link href="/profile">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #F5C518, #FFB800)',
              color: '#1A1A1A',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.opacity = '0.88'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement
              el.style.opacity = '1'
            }}
          >
            <ChefHat size={12} />
            View Profile
          </motion.div>
        </Link>
      </div>
    </motion.div>
  )
}

/* ─── Recent Friends ──────────────────────────────────────── */

interface RecentFriend {
  id: string
  username: string
  displayName: string
  profileImage: string | null
  recentPostTitle: string
  recentPostType: 'reel' | 'recipe'
  postedAt: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function RecentFriends() {
  const { theme } = useTheme()
  const router = useRouter()
  const isDark = theme === 'dark'
  const [friends, setFriends] = useState<RecentFriend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/social/following/recent-posts')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setFriends(data.friends ?? []))
      .catch(() => setFriends([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay: 0.25, ease: EASE }}
      className="rounded-[24px] backdrop-blur-xl p-5"
      style={{
        background: isDark ? '#2B2B2D' : '#FFFFFF',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(52,52,56,0.80)'
          : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.07)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245,197,24,0.15)' }}
          >
            <ChefHat size={13} style={{ color: '#F5C518' }} />
          </div>
          <h4 className="text-sm font-bold" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
            Friends
          </h4>
        </div>
        <button
          onClick={() => router.push('/friends')}
          className="text-[10px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--cr-accent)' }}
        >
          See all
        </button>
      </div>

      <div className="space-y-3">
        {loading && (
          <>
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full flex-shrink-0"
                  style={{ background: isDark ? '#343438' : '#E8E8E8' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 rounded-full w-24"
                    style={{ background: isDark ? '#343438' : '#E8E8E8' }} />
                  <div className="h-2 rounded-full w-36"
                    style={{ background: isDark ? '#3A3A3E' : '#F0F0F0' }} />
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && friends.length === 0 && (
          <p className="text-[11px] text-center py-2" style={{ color: isDark ? '#52525B' : '#C4C4C4' }}>
            Follow people to see their activity here
          </p>
        )}

        {!loading && friends.map((friend, i) => (
          <motion.div
            key={friend.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07, ease: EASE }}
            whileHover={{ x: 3 }}
            onClick={() => router.push(`/${friend.username}`)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            {/* Avatar with new-post ring */}
            <div className="relative flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full p-[2px]"
                style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800, #FF6B35)' }}
              >
                {friend.profileImage && !/googleusercontent\.com/i.test(friend.profileImage) ? (
                  <img
                    src={friend.profileImage}
                    alt={friend.displayName}
                    className="w-full h-full rounded-full object-cover"
                    style={{ border: `2px solid ${isDark ? '#2B2B2D' : '#FFFFFF'}` }}
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: isDark ? '#3A3A3E' : '#F5F5F5',
                      border: `2px solid ${isDark ? '#2B2B2D' : '#FFFFFF'}`,
                      color: isDark ? '#F5F5F5' : '#1A1A1A',
                    }}
                  >
                    {friend.displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              {/* New-post dot */}
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: '#F5C518', borderColor: isDark ? '#2B2B2D' : '#FFFFFF' }}
              />
            </div>

            {/* Name + post */}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold truncate leading-tight"
                style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}
              >
                {friend.displayName}
              </p>
              <p
                className="text-[10px] truncate mt-0.5 leading-tight"
                style={{ color: isDark ? '#71717A' : '#9CA3AF' }}
              >
                New {friend.recentPostType} · {friend.recentPostTitle}
              </p>
            </div>

            {/* Time ago */}
            <span
              className="text-[9px] font-medium flex-shrink-0"
              style={{ color: isDark ? '#52525B' : '#C4C4C4' }}
            >
              {timeAgo(friend.postedAt)}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── Quote Card ──────────────────────────────────────────── */

function QuoteCard() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setIdx(Math.floor(Math.random() * cookingQuotes.length))
  }, [])

  useEffect(() => {
    quoteImages.forEach(src => {
      const img = new window.Image()
      img.src = src
    })
  }, [])

  const imgSrc = quoteImages[idx % quoteImages.length]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, delay: 0.35, ease: EASE }}
      onClick={() => setIdx(i => (i + 1) % cookingQuotes.length)}
      className="relative rounded-[24px] overflow-hidden cursor-pointer min-h-[172px] group"
      style={{
        boxShadow: '0 4px 24px rgba(0,0,0,0.20)',
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={imgSrc}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imgSrc})` }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-black/62 group-hover:bg-black/52 transition-colors duration-300" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

      {/* Yellow quote accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-[#F5C518]/60 to-transparent" />

      <div className="absolute top-4 left-4 opacity-50" style={{ color: '#F5C518' }}>
        <Quote size={22} />
      </div>

      <div className="relative z-10 p-5 pt-11 flex flex-col gap-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-[14px] font-semibold text-white leading-relaxed italic"
          >
            &ldquo;{cookingQuotes[idx]}&rdquo;
          </motion.p>
        </AnimatePresence>
        <p className="text-xs text-white/45 font-medium">Tap for another quote ✨</p>
      </div>
    </motion.div>
  )
}

/* ─── Right Sidebar ───────────────────────────────────────── */

function RightSidebar({ username, profileStats }: { username: string; profileStats?: { posts: number; followers: number; following: number } }) {
  return (
    <aside className="hidden lg:block w-60 xl:w-64 flex-shrink-0">
      <div className="sticky top-6 space-y-4">
        <ProfileCard username={username} stats={profileStats} />
        <RecentFriends />
        <QuoteCard />
      </div>
    </aside>
  )
}

/* ─── Main export ─────────────────────────────────────────── */

export function DashboardCards({ username = 'Chef', userId = '', currentUserAvatar, profileStats }: DashboardCardsProps) {
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <>
      <div className="flex gap-5 xl:gap-7 pb-8">
        <div className="flex-1 min-w-0 space-y-10">
          <HeroSection username={username} onAddRecipe={() => setShowAddModal(true)} />
          <TrendingReels />
          <RecommendedSection currentUserName={username} currentUserAvatar={currentUserAvatar} currentUserId={userId} />
        </div>
        <RightSidebar username={username} profileStats={profileStats} />
      </div>
      {userId && (
        <AddContentModal open={showAddModal} onClose={() => setShowAddModal(false)} userId={userId} />
      )}
    </>
  )
}
