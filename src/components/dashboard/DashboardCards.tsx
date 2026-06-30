'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Play, Heart, Star, Clock, ArrowRight,
  ChefHat, Flame, Quote, Plus, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { AddContentModal } from '@/components/shared/AddContentModal'
import { ReelThumbnail } from '@/components/shared/ReelThumbnail'

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
  user: {
    id?: string
    username: string
    firstName?: string
    lastName?: string
    profileImage?: string | null
    isVerified?: boolean
  }
  trendingScore: number
}

interface ReelComment {
  id: string
  username: string
  userAvatar: string | null
  text: string
  createdAt: string
}


type AnyReel = TrendingReelItem | typeof trendingReels[0]

const MODAL_GRAD_PAIRS = [
  '#F5C518,#FFB800', '#FF6B6B,#FF4757', '#A29BFE,#6C5CE7',
  '#55EFC4,#00B894', '#FD79A8,#E84393', '#74B9FF,#0984E3',
]
function modalAvatarGrad(name: string) {
  return MODAL_GRAD_PAIRS[name.charCodeAt(0) % MODAL_GRAD_PAIRS.length]
}

function ModalUserAvatar({ username, profileImage, size = 40 }: { username: string; profileImage?: string | null; size?: number }) {
  const [err, setErr] = useState(false)
  const showImg = profileImage && !/googleusercontent\.com/i.test(profileImage) && !err
  const grad = modalAvatarGrad(username)
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0 overflow-hidden"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: showImg ? 'transparent' : `linear-gradient(135deg,${grad})`,
        color: '#1A1A1A',
      }}
    >
      {showImg
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={profileImage!} alt={username} className="w-full h-full object-cover" onError={() => setErr(true)} />
        : username[0]?.toUpperCase() ?? '?'
      }
    </div>
  )
}

function ReelModal({
  reels,
  index,
  isOpen,
  onClose,
  onChange,
}: {
  reels: AnyReel[]
  index: number
  isOpen: boolean
  onClose: () => void
  onChange: (i: number) => void
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const safeIdx = Math.max(0, Math.min(index, reels.length - 1))
  const reel    = reels[safeIdx]
  const isReal  = 'user' in reel
  const hasPrev = safeIdx > 0
  const hasNext = safeIdx < reels.length - 1

  // direction: 1 = forward (next), -1 = backward (prev)
  const [navDir, setNavDir] = useState(0)

  // Video
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [muted, setMuted] = useState(true)
  const mutedRef = useRef(true) // stable ref for callback ref closure

  // Touch swipe (mobile navigation)
  const touchStartX = useRef(0)
  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    if (dx > 50 && hasNext) go(safeIdx + 1)
    else if (dx < -50 && hasPrev) go(safeIdx - 1)
  }

  // Like
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [likePending, setLikePending] = useState(false)

  // Comments
  const [comments, setComments] = useState<ReelComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Follow
  const [following, setFollowing] = useState(false)
  const [followPending, setFollowPending] = useState(false)

  // Resolve display values
  const videoUrl     = isReal ? (reel as TrendingReelItem).videoUrl     : null
  const thumbUrl     = isReal ? (reel as TrendingReelItem).thumbnailUrl  : (reel as typeof trendingReels[0]).image
  const gradient     = isReal ? ((reel as TrendingReelItem).gradient ?? 'from-orange-600 to-rose-600') : (reel as typeof trendingReels[0]).gradient
  const duration     = isReal ? fmtDuration((reel as TrendingReelItem).duration) : (reel as typeof trendingReels[0]).duration
  const user         = isReal ? (reel as TrendingReelItem).user : null
  const username     = user?.username ?? (reel as typeof trendingReels[0]).creator
  const displayName  = user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : username
  const profileImage = user?.profileImage ?? null
  const isVerified   = user?.isVerified ?? false

  // Keyboard
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft'  && hasPrev) go(safeIdx - 1)
      if (e.key === 'ArrowRight' && hasNext)  go(safeIdx + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, safeIdx, hasPrev, hasNext]) // eslint-disable-line

  // Fetch comments + like status when reel changes
  useEffect(() => {
    if (!isReal || !isOpen) return
    const id = (reel as TrendingReelItem).id
    setComments([])
    setCommentsLoading(true)
    setLiked(false)
    setLikeCount((reel as TrendingReelItem).likeCount)
    setCommentCount((reel as TrendingReelItem).commentCount)
    setFollowing(false)
    Promise.all([
      fetch(`/api/reels/${id}/comments`).then(r => r.ok ? r.json() : null),
      fetch(`/api/reels/${id}/likes`).then(r => r.ok ? r.json() : null),
    ]).then(([cData, lData]) => {
      if (cData?.comments)             setComments(cData.comments)
      if (cData?.commentCount != null) setCommentCount(cData.commentCount)
      if (lData?.liked     != null)    setLiked(lData.liked)
      if (lData?.likeCount != null)    setLikeCount(lData.likeCount)
    }).catch(() => {}).finally(() => setCommentsLoading(false))
  }, [isReal, safeIdx]) // eslint-disable-line

  // Sync muted to stable ref so callback ref closure always sees latest value
  useEffect(() => {
    mutedRef.current = muted
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  // Play when src changes (navigation between reels while modal is open)
  useEffect(() => {
    if (!isOpen || !videoUrl) return
    const v = videoRef.current
    if (!v) return
    v.currentTime = 0
    v.muted = true
    v.play().then(() => { v.muted = mutedRef.current }).catch(() => {})
  }, [videoUrl]) // eslint-disable-line

  // Callback ref: fires synchronously the moment the <video> element
  // is actually in the DOM — bypasses AnimatePresence's internal render
  // delay that makes useEffect([isOpen]) see videoRef.current as null.
  function videoCallbackRef(el: HTMLVideoElement | null) {
    videoRef.current = el
    if (!el) return
    el.muted = true
    el.play().then(() => { el.muted = mutedRef.current }).catch(() => {})
  }

  function go(newIdx: number) {
    setNavDir(newIdx > safeIdx ? 1 : -1)
    onChange(newIdx)
  }

  async function toggleLike() {
    if (!isReal || likePending) return
    const id = (reel as TrendingReelItem).id
    setLikePending(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(c => wasLiked ? c - 1 : c + 1)
    try {
      await fetch(`/api/reels/${id}/like`, { method: wasLiked ? 'DELETE' : 'POST' })
    } catch {
      setLiked(wasLiked)
      setLikeCount(c => wasLiked ? c + 1 : c - 1)
    } finally { setLikePending(false) }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault()
    const text = newComment.trim()
    if (!text || !isReal || submitting) return
    const id = (reel as TrendingReelItem).id
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reels/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
        setCommentCount(data.commentCount)
        setNewComment('')
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
      }
    } catch {} finally { setSubmitting(false) }
  }

  async function toggleFollow() {
    if (followPending || !isReal) return
    const userId = (reel as TrendingReelItem).user.id
    if (!userId) return
    setFollowPending(true)
    const was = following
    setFollowing(!was)
    try {
      await fetch('/api/social/follow', {
        method: was ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      })
    } catch { setFollowing(was) }
    finally { setFollowPending(false) }
  }

  // Theme tokens
  const bg        = isDark ? '#1C1C1E' : '#FFFFFF'
  const borderCol = isDark ? '#2C2C2E' : '#E8E8E8'
  const textPri   = isDark ? '#F5F5F5' : '#1A1A1A'
  const textSec   = isDark ? '#8E8E93' : '#6B7280'
  const chipBg    = isDark ? '#2C2C2E' : '#F3F4F6'

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="reel-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center md:p-4"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}
        >
          {/* Prev arrow */}
          {hasPrev && (
            <button
              onClick={e => { e.stopPropagation(); go(safeIdx - 1) }}
              className="absolute left-2 md:left-6 z-10 hidden md:flex w-11 h-11 rounded-full items-center justify-center border border-white/20 text-white transition-all hover:bg-white/15 hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.10)' }}
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Card — never remounts on navigation */}
          <div
            onClick={e => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="relative flex flex-col md:flex-row overflow-hidden w-full h-full md:w-[94vw] md:max-w-[860px] md:h-[90vh] md:max-h-[560px] md:rounded-[20px]"
            style={{
              background: bg,
              border: `1px solid ${borderCol}`,
              boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
            }}
          >
            {/* Close — outside AnimatePresence so it doesn't animate on reel change */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: isDark ? 'rgba(55,55,60,0.9)' : 'rgba(240,240,240,0.9)', color: textSec }}
            >
              <X size={15} />
            </button>
            {/* ── Left: video — stable, src changes on nav ── */}
            <div className="relative flex-shrink-0 bg-black w-full h-[52vh] md:h-full md:w-[40%]">
              {videoUrl ? (
                <video
                  ref={videoCallbackRef}
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full object-cover"
                  loop playsInline
                />
              ) : thumbUrl ? (
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${thumbUrl})` }} />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 pointer-events-none" />

              {/* Counter + mute */}
              <div className="absolute top-3 left-3 right-3 md:right-3 flex items-center justify-between z-10 pr-10 md:pr-0">
                <span className="px-2.5 py-1 rounded-full text-white text-[11px] font-bold" style={{ background: 'rgba(0,0,0,0.52)' }}>
                  {safeIdx + 1} / {reels.length}
                </span>
                {videoUrl && (
                  <button
                    onClick={() => setMuted(m => !m)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{ background: 'rgba(0,0,0,0.52)' }}
                  >
                    {muted ? '🔇' : '🔊'}
                  </button>
                )}
              </div>

              {duration && (
                <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-white text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.52)' }}>
                  {duration}
                </div>
              )}
            </div>

            {/* Separator: horizontal on mobile, vertical on desktop */}
            <div className="h-px md:h-auto md:w-px flex-shrink-0" style={{ background: borderCol }} />

            {/* ── Right: info — slides directionally on nav ── */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={safeIdx}
                initial={{ opacity: 0, x: navDir * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -navDir * 28 }}
                transition={{ duration: 0.14, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex-1 flex flex-col min-w-0 overflow-hidden"
              >
                {/* User row */}
                <div className="flex items-center gap-3 px-4 py-3 md:pr-12 flex-shrink-0" style={{ borderBottom: `1px solid ${borderCol}` }}>
                  <ModalUserAvatar username={username} profileImage={profileImage} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm truncate" style={{ color: textPri }}>{displayName}</span>
                      {isVerified && (
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="10" fill="#F5C518" />
                          <path d="M6 10l2.5 2.5L14 7" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: textSec }}>@{username}</span>
                  </div>
                  {isReal && user?.id && (
                    <button
                      onClick={toggleFollow}
                      disabled={followPending}
                      className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
                      style={{
                        background: following ? 'transparent' : 'linear-gradient(135deg,#F5C518,#FFB800)',
                        color: following ? textSec : '#1A1A1A',
                        border: following ? `1px solid ${borderCol}` : 'none',
                      }}
                    >
                      {following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>

                {/* Title + pills */}
                <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${borderCol}` }}>
                  <h3 className="font-bold text-[15px] leading-snug mb-2.5" style={{ color: textPri }}>{reel.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: chipBg, color: textSec }}>
                      <Heart size={11} style={{ fill: liked ? '#FF4757' : 'none', stroke: liked ? '#FF4757' : 'currentColor' }} />
                      {fmtNum(likeCount)} likes
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: chipBg, color: textSec }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      {commentCount} comments
                    </span>
                  </div>
                </div>

                {/* Comments list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5" style={{ minHeight: 0 }}>
                  <p className="text-sm font-semibold" style={{ color: textPri }}>Comments</p>
                  {commentsLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="flex gap-2.5 animate-pulse">
                          <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: chipBg }} />
                          <div className="flex-1 space-y-1.5 pt-1">
                            <div className="h-2.5 rounded-full w-24" style={{ background: chipBg }} />
                            <div className="h-2 rounded-full w-40"  style={{ background: chipBg }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: textSec }}>No comments yet. Be the first!</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="flex gap-2.5">
                        <ModalUserAvatar username={c.username} profileImage={c.userAvatar} size={32} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold" style={{ color: textPri }}>@{c.username}</span>
                            <span className="text-[10px]"           style={{ color: textSec }}>{timeAgo(c.createdAt)}</span>
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: textSec }}>{c.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Action bar */}
                <div className="flex-shrink-0 px-4 py-2.5 flex items-center gap-5" style={{ borderTop: `1px solid ${borderCol}` }}>
                  <button onClick={toggleLike} className="flex items-center gap-1.5 transition-transform active:scale-90">
                    <Heart size={20} style={{ fill: liked ? '#FF4757' : 'none', stroke: liked ? '#FF4757' : textSec, transition: 'all 0.18s' }} />
                    <span className="text-sm font-medium" style={{ color: textSec }}>{fmtNum(likeCount)}</span>
                  </button>
                  <button className="flex items-center gap-1.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={textSec} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span className="text-sm font-medium" style={{ color: textSec }}>{commentCount}</span>
                  </button>
                  <div className="ml-auto flex items-center gap-3.5">
                    <button>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={textSec} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    <button>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={textSec} strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    </button>
                  </div>
                </div>

                {/* Comment input */}
                <form
                  onSubmit={postComment}
                  className="flex-shrink-0 px-4 py-3 flex items-center gap-3"
                  style={{ borderTop: `1px solid ${borderCol}` }}
                >
                  <ModalUserAvatar username="me" profileImage={null} size={36} />
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 text-sm rounded-full px-4 py-2 outline-none"
                    style={{ background: chipBg, color: textPri, border: 'none' }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(e as unknown as React.FormEvent) } }}
                  />
                  {newComment.trim() && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                    >
                      {submitting ? '…' : 'Post'}
                    </button>
                  )}
                </form>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next arrow */}
          {hasNext && (
            <button
              onClick={e => { e.stopPropagation(); go(safeIdx + 1) }}
              className="absolute right-2 md:right-6 z-10 hidden md:flex w-11 h-11 rounded-full items-center justify-center border border-white/20 text-white transition-all hover:bg-white/15 hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.10)' }}
            >
              <ChevronRight size={22} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function TrendingReels() {
  const router = useRouter()
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-80px' })
  const scrollRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [reels, setReels] = useState<TrendingReelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [modalIdx, setModalIdx] = useState<number | null>(null)

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
                  if ('user' in reel) {
                    router.push(`/reel/${(reel as TrendingReelItem).id}`)
                  } else {
                    setModalIdx(i)
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

      {/* Reel popup modal */}
      <ReelModal
        reels={activeReels as AnyReel[]}
        index={modalIdx ?? 0}
        isOpen={modalIdx !== null}
        onClose={() => setModalIdx(null)}
        onChange={setModalIdx}
      />

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
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [recipes, setRecipes] = useState<RecommendedRecipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/recipes/recommended')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.recipes)) {
          setRecipes(shuffleArray(data.recipes) as RecommendedRecipe[])
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
                onClick={() => router.push(`/recipe/${recipe.id}`)}
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

                  <div className="flex items-center gap-2 mt-3">
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
                </div>
              </motion.article>
            )
          })}
        </div>
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
