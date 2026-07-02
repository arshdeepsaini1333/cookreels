'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Search, Play,
  ChevronLeft, ChevronRight, ArrowRight, Flame,
  TrendingUp, Users, Plus, X,
  Camera, Utensils,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { ReelThumbnail } from '@/components/shared/ReelThumbnail'

/* ─── Types ───── */

interface DbCategory {
  id: string
  name: string
  slug: string
  emoji: string | null
  group: string | null
  sortOrder: number
}

interface Recipe {
  id: string | number
  title: string
  description: string
  image: string | null
  cuisine: string
  time: string
  calories: number
  rating: number
  ratingCount: number
  creator: string
  username: string
  creatorEmoji: string
  tags: string[]
  isVeg: boolean
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

interface Reel {
  id: string | number
  title: string
  thumbnail: string | null
  videoUrl: string
  creator: string
  username: string
  creatorEmoji: string
  likes: string
  likeCount: number
  comments: string
  duration: number | null
  views: string
  trending: boolean
  gradient: string
  emoji: string
}

/* ─── Animation Variants ─────────────────────────────────────── */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: EASE, delay },
})

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const cardReveal = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
}

/* ─── Static Data ────────────────────────────────────────────── */

const ALL_TAB = { id: 'all', label: 'All', emoji: '✨' }

const LIVE_SECTIONS = [
  { slug: 'breakfast', title: 'Breakfast',   emoji: '🍳', gradient: 'from-amber-400 to-orange-500',  description: 'Start your day with energy-packed morning meals' },
  { slug: 'lunch',     title: 'Lunch',       emoji: '🍱', gradient: 'from-green-400 to-emerald-500', description: 'Fresh and satisfying midday meals' },
  { slug: 'dinner',    title: 'Dinner',      emoji: '🌙', gradient: 'from-indigo-400 to-purple-500', description: 'Hearty recipes to end your day right' },
  { slug: 'snacks',    title: 'Easy Snacks', emoji: '🍿', gradient: 'from-pink-400 to-rose-500',     description: 'Quick bites and snacks for any time of day' },
]



const TRENDING_SEARCHES = [
  'Butter Chicken', 'Avocado Toast', 'Dal Makhani',
  'Pasta Carbonara', 'Masala Dosa', 'Buddha Bowl', 'Smash Burger',
]

/* ─── Hero Banner ─────────────────────────────────────────────── */

const FLOAT_EMOJIS = ['🍕','🍛','🥗','🍰','🥤','🌮','🍳','🥑']

function HeroBanner() {
  const { theme } = useTheme()
  const router = useRouter()
  const dark = theme === 'dark'

  return (
    <section
      className="relative overflow-hidden rounded-2xl flex items-center"
      style={{
        background: dark
          ? 'linear-gradient(135deg, #1E1E1F 0%, #242425 50%, #1E1E1F 100%)'
          : 'linear-gradient(135deg, #FFFDF5 0%, #FFF8E1 50%, #FFFDF5 100%)',
        border: dark ? '1px solid rgba(245,197,24,0.12)' : '1.5px solid rgba(245,197,24,0.18)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            `radial-gradient(ellipse 60% 80% at 8% 50%, rgba(245,197,24,${dark ? '0.13' : '0.12'}) 0%, transparent 55%)`,
            `radial-gradient(ellipse 40% 60% at 92% 30%, rgba(245,197,24,${dark ? '0.05' : '0.07'}) 0%, transparent 50%)`,
          ].join(','),
        }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #F5C518 1px, transparent 0)`,
          backgroundSize: '28px 28px',
          opacity: dark ? 0.025 : 0.045,
        }}
      />

      {/* Floating emojis — right side only */}
      <div className="absolute right-0 inset-y-0 w-1/2 overflow-hidden pointer-events-none select-none">
        {FLOAT_EMOJIS.map((em, i) => (
          <motion.span
            key={i}
            className="absolute text-xl sm:text-2xl"
            style={{
              left:    `${10 + (i * 11.5) % 75}%`,
              top:     `${8  + (i * 18.3) % 76}%`,
              opacity: dark ? 0.07 + (i % 3) * 0.02 : 0.13 + (i % 3) * 0.03,
            }}
            animate={{ y: [0, -10, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: 3.2 + (i % 3) * 1.1, delay: i * 0.28, repeat: Infinity, ease: 'easeInOut' }}
          >
            {em}
          </motion.span>
        ))}
      </div>

      {/* Content — single horizontal row */}
      <div className="relative z-10 w-full px-5 sm:px-8 py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: badge + title + subtitle */}
        <div className="flex-1 min-w-0">
          <motion.div
            {...fadeUp(0)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 border"
            style={{
              background: dark ? 'rgba(245,197,24,0.09)' : 'rgba(245,197,24,0.09)',
              borderColor: dark ? 'rgba(245,197,24,0.25)' : 'rgba(245,197,24,0.25)',
            }}
          >
            <Flame size={11} style={{ color: 'var(--cr-accent)' }} />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--cr-accent)' }}>
              21 Categories · 500+ Recipes · Daily Reels
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.06)}
            className="font-heading text-xl sm:text-2xl font-black leading-tight tracking-tight"
            style={{ color: dark ? '#F5F5F5' : '#1A1A1A' }}
          >
            Discover Recipes{' '}
            <span
              className="animate-gradient-x bg-clip-text text-transparent"
              style={{
                backgroundImage: dark
                  ? 'linear-gradient(90deg, #F5C518, #FFD84D, #F5C518, #FFB800)'
                  : 'linear-gradient(90deg, #D4A017, #F5C518, #FFD84D, #D4A017)',
                backgroundSize: '200% 200%',
              }}
            >
              You&apos;ll Love
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.11)}
            className="text-xs sm:text-sm mt-1.5 leading-relaxed"
            style={{ color: dark ? '#71717A' : '#9CA3AF' }}
          >
            Trending reels, curated recipes &amp; categories for every craving.
          </motion.p>
        </div>

        {/* Right: CTAs */}
        <motion.div {...fadeUp(0.16)} className="flex items-center gap-2.5 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => router.push('/reels')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm"
            style={{
              background: 'linear-gradient(135deg, #F5C518, #FFB800)',
              boxShadow: dark ? '0 6px 20px rgba(245,197,24,0.35)' : '0 6px 20px rgba(245,197,24,0.40)',
              color: '#1A1A1A',
            }}
          >
            <Play size={13} fill="#1A1A1A" /> Explore Reels
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => router.push('/friends')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm border"
            style={{
              borderColor: dark ? 'rgba(245,197,24,0.28)' : 'rgba(245,197,24,0.32)',
              background:   dark ? 'rgba(245,197,24,0.06)' : 'rgba(245,197,24,0.06)',
              color:        dark ? '#F5F5F5' : '#1A1A1A',
            }}
          >
            <Users size={13} /> Add Friends
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}

/* ─── Category Tabs ──────────────────────────────────────────── */

function CategoryTabs({
  active, onChange, categories, loading,
}: {
  active: string
  onChange: (id: string) => void
  categories: DbCategory[]
  loading: boolean
}) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const rowRef     = useRef<HTMLDivElement>(null)
  const dragging   = useRef(false)
  const startX     = useRef(0)
  const scrollLeft = useRef(0)
  const moved      = useRef(false)

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current   = true
    moved.current      = false
    startX.current     = e.pageX - (rowRef.current?.offsetLeft ?? 0)
    scrollLeft.current = rowRef.current?.scrollLeft ?? 0
    if (rowRef.current) rowRef.current.style.cursor = 'grabbing'
  }
  const stopDrag = () => {
    dragging.current = false
    if (rowRef.current) rowRef.current.style.cursor = 'grab'
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !rowRef.current) return
    e.preventDefault()
    const x    = e.pageX - rowRef.current.offsetLeft
    const walk = (x - startX.current) * 1.4
    if (Math.abs(walk) > 4) moved.current = true
    rowRef.current.scrollLeft = scrollLeft.current - walk
  }

  const tabs = [
    ALL_TAB,
    ...categories.map(c => ({ id: c.slug, label: c.name, emoji: c.emoji ?? '🍽️' })),
  ]

  return (
    <div className="sticky top-0 z-30 -mx-1 px-1 py-3 bg-[#FFFDF5]/92 dark:bg-[#1E1E1F]/92 backdrop-blur-md">
      <div
        ref={rowRef}
        className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 select-none"
        style={{ touchAction: 'pan-x', cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onMouseMove={onMouseMove}
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex-none h-8 rounded-full animate-pulse"
                style={{
                  width: `${60 + (i % 3) * 20}px`,
                  background: dark ? '#2B2B2D' : '#E8E8E8',
                }}
              />
            ))
          : tabs.map((tab) => {
              const isActive = tab.id === active
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => { if (!moved.current) onChange(tab.id) }}
                  className={`flex-none flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${
                    isActive
                      ? 'dark:text-white text-[#1A1A1A]'
                      : 'text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#2B2B2D]/70 border border-zinc-200/80 dark:border-[#343438] hover:border-[#F5C518]/35 dark:hover:border-[#F5C518]/35'
                  }`}
                  style={isActive ? {
                    background: dark ? 'linear-gradient(135deg, #F5C518, #FFB800)' : 'linear-gradient(135deg, #F5C518, #FFD84D)',
                    boxShadow:  dark ? '0 0 18px 4px rgba(245,197,24,0.28)' : '0 0 18px 4px rgba(245,197,24,0.30)',
                  } : {}}
                >
                  <span>{tab.emoji}</span>
                  {tab.label}
                </motion.button>
              )
            })}
      </div>
    </div>
  )
}

/* ─── Search & Filters ───────────────────────────────────────── */

type ContentType = 'all' | 'recipe' | 'reel'

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; emoji: string }[] = [
  { value: 'all',    label: 'All',     emoji: '✨' },
  { value: 'recipe', label: 'Recipes', emoji: '🍽️' },
  { value: 'reel',   label: 'Reels',   emoji: '🎬' },
]

function SearchFilters({
  query,
  onQuery,
  contentType,
  onContentType,
}: {
  query: string
  onQuery: (q: string) => void
  contentType: ContentType
  onContentType: (t: ContentType) => void
}) {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 160)}
          placeholder={
            contentType === 'recipe'
              ? 'Search recipes, cuisines, ingredients…'
              : contentType === 'reel'
              ? 'Search reels by title…'
              : 'Search recipes, reels, cuisines…'
          }
          className="w-full pl-11 pr-10 py-3.5 rounded-2xl text-sm font-medium bg-white dark:bg-[#2B2B2D]/80 border border-zinc-200/80 dark:border-[#343438] text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#F5C518]/50 dark:focus:border-[#F5C518]/50 focus:ring-2 focus:ring-[#F5C518]/18 dark:focus:ring-[#F5C518]/18 transition-colors"
        />
        {query && (
          <button
            onClick={() => { onQuery(''); inputRef.current?.focus() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={14} />
          </button>
        )}

        {/* Trending suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && !query && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-white dark:bg-[#2B2B2D] border border-zinc-200/80 dark:border-[#343438] shadow-xl z-50 overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-[#343438]/70">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Trending Searches</span>
              </div>
              {TRENDING_SEARCHES.map((s) => (
                <button
                  key={s}
                  onMouseDown={() => onQuery(s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-left"
                >
                  <TrendingUp size={13} style={{ color: 'var(--cr-accent)' }} />
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content type filter pills */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 shrink-0">Show:</span>
        <div className="flex gap-1.5">
          {CONTENT_TYPE_OPTIONS.map((opt) => {
            const isActive = contentType === opt.value
            return (
              <motion.button
                key={opt.value}
                whileTap={{ scale: 0.93 }}
                onClick={() => onContentType(opt.value)}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150"
                style={
                  isActive
                    ? {
                        background: dark ? 'linear-gradient(135deg,#F5C518,#FFB800)' : 'linear-gradient(135deg,#F5C518,#FFD84D)',
                        color: '#1A1A1A',
                        boxShadow: '0 0 12px 2px rgba(245,197,24,0.28)',
                      }
                    : {
                        background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
                        color: dark ? '#A1A1AA' : '#52525B',
                        border: `1px solid ${dark ? '#343438' : 'rgba(0,0,0,0.10)'}`,
                      }
                }
              >
                <span className="text-[11px]">{opt.emoji}</span>
                {opt.label}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────────── */

function fmtDuration(secs: number | null): string | null {
  if (!secs) return null
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const FALLBACK_GRADIENTS = [
  'from-orange-500 to-rose-600',  'from-amber-500 to-orange-700',
  'from-pink-400 to-fuchsia-600', 'from-emerald-500 to-teal-700',
  'from-red-500 to-orange-600',   'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',    'from-yellow-500 to-amber-600',
]

/* ─── Recipe Card (explore-style) ───────────────────────────── */

function RecipeCard({ recipe, idx = 0, height = '100%', onClick }: { recipe: Recipe; idx?: number; height?: number | string; onClick?: () => void }) {
  const grad = FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length]
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl cursor-pointer w-full bg-gradient-to-br ${grad}`}
      style={{ height }}
    >
      {recipe.image && (
        <img
          src={recipe.image}
          alt={recipe.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 px-3 pb-2.5 pointer-events-none">
        <p className="text-white text-xs font-bold truncate drop-shadow leading-tight">{recipe.title}</p>
        <p className="text-white/60 text-[10px] truncate mt-0.5 drop-shadow">@{recipe.username}</p>
      </div>
    </motion.div>
  )
}

/* ─── Reel Card (explore-style) ─────────────────────────────── */

function ReelCard({ reel, idx = 0, height = '100%', onClick }: { reel: Reel; idx?: number; height?: number | string; onClick?: () => void }) {
  const grad = reel.gradient?.startsWith('from-') ? reel.gradient : (FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length])
  const duration = fmtDuration(reel.duration)
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl cursor-pointer w-full group bg-gradient-to-br ${grad}`}
      style={{ height }}
    >
      <ReelThumbnail
        videoUrl={reel.videoUrl}
        thumbnailUrl={reel.thumbnail}
        imgClassName="transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
      <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl transition-all duration-200 group-hover:bg-white/30 group-hover:scale-110">
          <Play className="w-7 h-7 text-white fill-white ml-0.5" />
        </div>
      </div>

      {duration && (
        <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[9px] text-white font-bold pointer-events-none">
          {duration}
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 px-3 pb-3 pointer-events-none">
        <p className="text-white text-xs font-bold truncate drop-shadow-md leading-tight">{reel.title}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-white/60 text-[10px] truncate">@{reel.username}</span>
          {reel.likeCount > 0 && (
            <span className="text-white/60 text-[10px] shrink-0 ml-2">♥ {reel.likes}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Mixed Discovery Grid ───────────────────────────────────── */

// Row height varies by breakpoint (shorter on mobile) via a CSS custom
// property — a plain JS constant can't respond to a media query, and this
// grid's cells (reel + recipe cards) share one row height, so the mobile
// value has to be set where the row itself is defined, not per-card.
const ROW_HEIGHT_CLASS = '[--row-h:220px] sm:[--row-h:340px]'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type GridItem = { type: 'reel'; data: Reel } | { type: 'recipe'; data: Recipe }

function MixedGrid({ query, activeTab, contentType }: { query: string; activeTab: string; contentType: ContentType }) {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [reels,   setReels]   = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const cat      = activeTab
    const q        = query ? `&q=${encodeURIComponent(query)}` : ''
    const wantRec  = contentType !== 'reel'
    const wantReel = contentType !== 'recipe'

    Promise.all([
      wantRec  ? fetch(`/api/content?type=recipe&limit=32&category=${cat}${q}`).then(r => r.json()) : Promise.resolve({ recipes: [] }),
      wantReel ? fetch(`/api/content?type=reel&limit=8&category=${cat}${q}`).then(r => r.json())   : Promise.resolve({ reels: [] }),
    ])
      .then(([recipeData, reelData]) => {
        setRecipes(shuffle(Array.isArray(recipeData.recipes) ? recipeData.recipes : []))
        setReels(shuffle(Array.isArray(reelData.reels) ? reelData.reels : []))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeTab, query, contentType])

  // Interleave: 1 reel then 4 recipes, repeat — fills left-to-right, top-to-bottom
  const items = useMemo<GridItem[]>(() => {
    const result: GridItem[] = []
    let rIdx = 0, recIdx = 0
    while (rIdx < reels.length || recIdx < recipes.length) {
      if (rIdx < reels.length) result.push({ type: 'reel', data: reels[rIdx++] })
      for (let i = 0; i < 4 && recIdx < recipes.length; i++) {
        result.push({ type: 'recipe', data: recipes[recIdx++] })
      }
    }
    return result
  }, [reels, recipes])

  if (loading) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${ROW_HEIGHT_CLASS}`} style={{ gridAutoRows: 'var(--row-h)' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl animate-pulse" style={{ background: 'var(--cr-border)' }} />
        ))}
      </div>
    )
  }

  if (recipes.length === 0 && reels.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="text-5xl">🔍</div>
        <p className="font-heading text-lg font-bold text-zinc-700 dark:text-zinc-300">No results found</p>
        <p className="text-sm text-zinc-400">Try a different search term or category</p>
      </div>
    )
  }

  return (
    <>
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${ROW_HEIGHT_CLASS}`} style={{ gridAutoRows: 'var(--row-h)' }}>
        {items.map((item, idx) =>
          item.type === 'reel'
            ? <ReelCard   key={`reel-${item.data.id}`}   reel={item.data}   idx={idx} height="100%" onClick={() => {
                const ids = items.filter(i => i.type === 'reel').map(i => String(i.data.id))
                try { sessionStorage.setItem('__cr_nav_ctx', JSON.stringify({ type: 'reel', ids })) } catch {}
                router.push(`/reel/${item.data.id}`)
              }} />
            : <RecipeCard key={`recipe-${item.data.id}`} recipe={item.data} idx={idx} height="100%" onClick={() => {
                const ids = items.filter(i => i.type === 'recipe').map(i => String(i.data.id))
                try { sessionStorage.setItem('__cr_nav_ctx', JSON.stringify({ type: 'recipe', ids })) } catch {}
                router.push(`/recipe/${item.data.id}`)
              }} />
        )}
      </div>
    </>
  )
}

/* ─── Category Carousel Section (live data) ──────────────────── */

function CategoryCarouselLive({ section }: { section: typeof LIVE_SECTIONS[0] }) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/content?type=recipe&category=${section.slug}&limit=30`)
      .then(r => r.json())
      .then(d => {
        const all: Recipe[] = Array.isArray(d.recipes) ? d.recipes : []
        setRecipes(shuffle(all).slice(0, 15))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [section.slug])

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 260 : -260, behavior: 'smooth' })
  }

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: EASE }}
      className="space-y-4"
    >
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${section.gradient} flex items-center justify-center text-sm shadow-md`}>
              {section.emoji}
            </div>
            <h2 className="font-heading text-lg sm:text-xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
              {section.title}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 ml-9">{section.description}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => scroll('left')} className="p-1.5 rounded-lg bg-white dark:bg-[#2B2B2D] border border-zinc-200/80 dark:border-[#343438] text-zinc-500 hover:border-[#F5C518]/45 dark:hover:border-[#F5C518]/45 hover:text-[#F5C518] dark:hover:text-[#F5C518] transition-all">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => scroll('right')} className="p-1.5 rounded-lg bg-white dark:bg-[#2B2B2D] border border-zinc-200/80 dark:border-[#343438] text-zinc-500 hover:border-[#F5C518]/45 dark:hover:border-[#F5C518]/45 hover:text-[#F5C518] dark:hover:text-[#F5C518] transition-all">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-none w-52 sm:w-56 rounded-2xl animate-pulse" style={{ aspectRatio: '4/3', background: 'var(--cr-card)', border: '1px solid var(--cr-border)' }} />
            ))
          : recipes.map((recipe, i) => (
              <div key={recipe.id} className="flex-none w-52 sm:w-56" style={{ height: 180 }}>
                <RecipeCard recipe={recipe} idx={i} height="100%" onClick={() => {
                  const ids = recipes.map(r => String(r.id))
                  try { sessionStorage.setItem('__cr_nav_ctx', JSON.stringify({ type: 'recipe', ids })) } catch {}
                  router.push(`/recipe/${recipe.id}`)
                }} />
              </div>
            ))
        }
      </div>
    </motion.section>
  )
}

/* ─── Trending Section (live data) ──────────────────────────── */

function TrendingSection() {
  const router = useRouter()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-70px' })
  const [reels,   setReels]   = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/content?type=reel&limit=6&category=all')
      .then(r => r.json())
      .then(d => setReels(Array.isArray(d.reels) ? d.reels : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section ref={ref} className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp size={18} style={{ color: 'var(--cr-accent)' }} />
            <h2 className="font-heading text-xl sm:text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
              Trending on CookReels
            </h2>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 ml-[26px]">
            Most watched reels &amp; viral recipes this week
          </p>
        </div>
        <button className="flex items-center gap-1 text-xs font-semibold hover:opacity-75 transition-opacity" style={{ color: 'var(--cr-accent)' }}>
          See all <ArrowRight size={11} />
        </button>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${ROW_HEIGHT_CLASS}`}
        style={{ gridAutoRows: 'var(--row-h)' }}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ background: 'var(--cr-card)', border: '1px solid var(--cr-border)' }} />
            ))
          : reels.map((reel, i) => (
              <motion.div key={reel.id} variants={cardReveal}>
                <ReelCard reel={reel} onClick={() => {
                  const ids = reels.map(r => String(r.id))
                  try { sessionStorage.setItem('__cr_nav_ctx', JSON.stringify({ type: 'reel', ids })) } catch {}
                  router.push(`/reel/${reel.id}`)
                }} />
              </motion.div>
            ))
        }
      </motion.div>
    </section>
  )
}

/* ─── Trending Recipes Section (live data) ───────────────────── */

function TrendingRecipesSection() {
  const router = useRouter()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-70px' })
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // API already orders by isTrending desc, likeCount desc — no extra params needed
    fetch('/api/content?type=recipe&limit=9&category=all')
      .then(r => r.json())
      .then(d => setRecipes(Array.isArray(d.recipes) ? d.recipes : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section ref={ref} className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Flame size={18} style={{ color: 'var(--cr-accent)' }} />
            <h2 className="font-heading text-xl sm:text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
              Trending Recipes
            </h2>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 ml-[26px]">
            Most loved recipes with the highest likes this week
          </p>
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        style={{ gridAutoRows: 200 }}
      >
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ background: 'var(--cr-card)', border: '1px solid var(--cr-border)' }} />
            ))
          : recipes.map((recipe, i) => (
              <motion.div key={recipe.id} variants={cardReveal}>
                <RecipeCard recipe={recipe} idx={i} height="100%" onClick={() => {
                  const ids = recipes.map(r => String(r.id))
                  try { sessionStorage.setItem('__cr_nav_ctx', JSON.stringify({ type: 'recipe', ids })) } catch {}
                  router.push(`/recipe/${recipe.id}`)
                }} />
              </motion.div>
            ))
        }
      </motion.div>
    </section>
  )
}

/* ─── Discovery Sidebar ──────────────────────────────────────── */

interface TopCreator {
  id: string
  name: string
  username: string
  profileImage: string | null
  specialty: string
  followers: string
  recipeCount: number
}

const CREATOR_AVATAR_EMOJIS = ['👨‍🍳', '👩‍🍳', '🧑‍🍳', '👨‍🍳', '👩‍🍳']

function DiscoverySidebar() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const router = useRouter()

  const [creators, setCreators]       = useState<TopCreator[]>([])
  const [creatorsLoading, setCreatorsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/top-creators')
      .then(r => r.json())
      .then(d => setCreators(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCreatorsLoading(false))
  }, [])

  return (
    <aside className="hidden xl:flex flex-col gap-5 w-60 flex-none self-start sticky top-[72px]">
      {/* Top Creators */}
      <div className="rounded-2xl bg-white dark:bg-[#2B2B2D] border border-zinc-200/60 dark:border-[#343438] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Users size={14} style={{ color: 'var(--cr-accent)' }} />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Top Creators</h3>
          </div>
        </div>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-3.5">Most active this month</p>
        <div className="space-y-3">
          {creatorsLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 animate-pulse">
                  <div className="w-8 h-8 rounded-full flex-none" style={{ background: 'var(--cr-border)' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 rounded-full w-3/4" style={{ background: 'var(--cr-border)' }} />
                    <div className="h-2 rounded-full w-1/2" style={{ background: 'var(--cr-border)' }} />
                  </div>
                </div>
              ))
            : creators.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2.5">
                  {c.profileImage && !/googleusercontent\.com/i.test(c.profileImage)
                    ? (
                        <img
                          src={c.profileImage}
                          alt={c.name}
                          className="w-8 h-8 rounded-full object-cover flex-none"
                          style={{ border: '1px solid var(--cr-accent-border)' }}
                        />
                      )
                    : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-none"
                          style={{ background: 'var(--cr-accent-soft)', border: '1px solid var(--cr-accent-border)' }}
                        >
                          {CREATOR_AVATAR_EMOJIS[i % CREATOR_AVATAR_EMOJIS.length]}
                        </div>
                      )
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100 truncate">{c.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {c.specialty} · {c.followers} followers
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--cr-accent)' }}>
                      {c.recipeCount} recipe{c.recipeCount !== 1 ? 's' : ''} this month
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/user/${c.username}`)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-none transition-colors hover:bg-[#F5C518] dark:hover:bg-[#F5C518] hover:text-[#1A1A1A] dark:hover:text-[#1A1A1A]"
                    style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)', border: '1px solid var(--cr-accent-border)' }}
                  >
                    View
                  </button>
                </div>
              ))
          }
        </div>
      </div>

      {/* Seasonal Picks promo card */}
      <div
        className="rounded-2xl overflow-hidden relative p-4 min-h-[130px] flex flex-col justify-between"
        style={{
          background: dark
            ? 'linear-gradient(135deg, #1E1E1F, #2B2B2D)'
            : 'linear-gradient(135deg, #FFFDF5, #FFF8E1, #FFFAED)',
          border: dark ? '1px solid rgba(245,197,24,0.12)' : '1.5px solid rgba(245,197,24,0.22)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: dark
              ? 'radial-gradient(ellipse at 25% 55%, rgba(245,197,24,0.22), transparent 65%)'
              : 'radial-gradient(ellipse at 25% 55%, rgba(245,197,24,0.18), transparent 65%)',
          }}
        />
        <div className="relative z-10">
          <div className="text-2xl mb-2">🌿</div>
          <div className={`text-xs font-bold mb-0.5 ${dark ? 'text-[#F5F5F5]' : 'text-[#1A1A1A]'}`}>
            Seasonal Picks
          </div>
          <div className={`text-[10px] leading-relaxed ${dark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Fresh ingredients, bold flavors for the season
          </div>
        </div>
        <button
          onClick={() => router.push('/explore')}
          className="relative z-10 mt-3 self-start text-[10px] font-bold px-3 py-1 rounded-full transition-colors hover:opacity-80"
          style={{
            background: 'var(--cr-accent-soft)',
            color: 'var(--cr-accent)',
            border: '1px solid var(--cr-accent-border)',
          }}
        >
          Explore Now →
        </button>
      </div>
    </aside>
  )
}

/* ─── Floating Action Button ─────────────────────────────────── */

function FloatingFAB() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [open, setOpen] = useState(false)

  const actions = [
    { icon: Camera,   label: 'Upload Reel' },
    { icon: Utensils, label: 'Add Recipe'  },
  ]

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2 lg:bottom-8 lg:right-6">
      <AnimatePresence>
        {open && actions.map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 10, scale: 0.82 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.82 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 22 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg whitespace-nowrap"
            style={{
              background: dark ? 'linear-gradient(135deg, #F5C518, #FFB800)' : 'linear-gradient(135deg, #F5C518, #FFD84D)',
              color: '#1A1A1A',
            }}
          >
            <action.icon size={13} /> {action.label}
          </motion.button>
        ))}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.91 }}
        onClick={() => setOpen((v) => !v)}
        className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl animate-pulse-glow"
        style={{ background: dark ? 'linear-gradient(135deg, #F5C518, #FFB800)' : 'linear-gradient(135deg, #F5C518, #FFD84D)' }}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        >
          <Plus size={22} style={{ color: '#1A1A1A' }} />
        </motion.div>
      </motion.button>
    </div>
  )
}

/* ─── Page Export ────────────────────────────────────────────── */

export function CategoriesPage({ username }: { username?: string }) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [contentType, setContentType] = useState<ContentType>('all')
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setCategoriesLoading(false))
  }, [])

  // Debounce search input so API is called 400ms after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const activeLabel = activeTab === 'all'
    ? 'Discover & Explore'
    : categories.find(c => c.slug === activeTab)?.name ?? 'Explore'

  const sectionLabel = debouncedQuery ? `Results for "${debouncedQuery}"` : activeLabel

  const isFiltered = activeTab !== 'all' || debouncedQuery !== '' || contentType !== 'all'

  const filteredSubtitle = debouncedQuery
    ? `Showing ${contentType === 'recipe' ? 'recipes' : contentType === 'reel' ? 'reels' : 'recipes and reels'} matching "${debouncedQuery}"`
    : contentType !== 'all'
    ? `Showing ${contentType === 'recipe' ? 'recipes' : 'reels'} only`
    : 'Showing matching recipes and reels'

  return (
    <div className="relative min-h-screen">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-5 py-5 space-y-7">
        <HeroBanner />
        <CategoryTabs
          active={activeTab}
          onChange={setActiveTab}
          categories={categories}
          loading={categoriesLoading}
        />
        <SearchFilters
          query={searchQuery}
          onQuery={setSearchQuery}
          contentType={contentType}
          onContentType={setContentType}
        />

        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-10">
            <section>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">
                    {sectionLabel}
                  </h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {isFiltered ? filteredSubtitle : 'Reels and recipes mixed for you'}
                  </p>
                </div>
              </div>

              <MixedGrid query={debouncedQuery} activeTab={activeTab} contentType={contentType} />
            </section>

            {!isFiltered && (
              <>
                {LIVE_SECTIONS.map((section) => (
                  <CategoryCarouselLive key={section.slug} section={section} />
                ))}
                <TrendingRecipesSection />
              </>
            )}
          </div>

          <DiscoverySidebar />
        </div>
      </div>

      <FloatingFAB />
    </div>
  )
}
