'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Share2, MessageCircle,
  UserPlus, UserCheck, Users, ChefHat, Flame, Heart, Play,
  Clock, Film, Eye, BadgeCheck,
  Tag, ChevronRight, Lock, Flag,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useTheme } from '@/context/ThemeContext'
import type { ProfileRecipe, ProfileReel, ProfileStats, ProfileUser } from './ProfilePage'
import { SocialListModal } from '@/components/profile/SocialListModal'
import type { SocialListType } from '@/components/profile/SocialListModal'
import { ReportModal } from '@/components/shared/ReportModal'
import { LoginPromptModal } from '@/components/auth/LoginPromptModal'

// ─── Public profile prop types ────────────────────────────────────────────────

export interface PublicProfilePageProps {
  user:                 ProfileUser
  stats:                ProfileStats
  initialRecipes:       ProfileRecipe[]
  initialReels:         ProfileReel[]
  totalRecipes:         number
  totalReels:           number
  currentUserId:        string | null
  currentUserName:      string
  initialFollowStatus:  'none' | 'pending' | 'accepted'
  initialIsFollowedBy:  boolean
  isPrivate:            boolean
}

// ─── Animation presets 
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const staggerContainer = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: delay } },
})

const cardReveal = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 28 },
  },
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: EASE, delay },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function fmtTime(minutes: number | null | undefined): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60), m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60), s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Static display data 

const PUB_TABS = ['Recipes', 'Reels', 'Tagged'] as const
type PublicTab = (typeof PUB_TABS)[number]

const CARD_GRADIENTS = [
  'from-orange-600 to-rose-600',    'from-amber-500 to-orange-700',
  'from-pink-400 to-fuchsia-600',   'from-yellow-500 to-amber-600',
  'from-emerald-500 to-teal-700',   'from-red-500 to-orange-600',
  'from-rose-400 to-pink-600',      'from-green-500 to-emerald-600',
  'from-violet-500 to-purple-600',  'from-cyan-500 to-blue-600',
  'from-indigo-500 to-violet-600',  'from-teal-500 to-emerald-600',
]

const DIFF_LABEL: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }
const DIFF_STYLE: Record<string, string> = {
  EASY:   'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  MEDIUM: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  HARD:   'bg-red-500/15 text-red-500',
}

// ─── AnimatedStat ─────────────────────────────────────────────────────────────

function AnimatedStat({ value, label }: { value: number; label: string }) {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let frame: number
    let current = 0
    const increment = value / 60
    const tick = () => {
      current += increment
      if (current >= value) { setCount(value) }
      else { setCount(Math.floor(current)); frame = requestAnimationFrame(tick) }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value])

  return (
    <motion.div
      ref={ref}
      whileHover={{ scale: 1.08 }}
      className="flex flex-col items-center cursor-pointer select-none px-2 sm:px-3"
    >
      <span className="text-base sm:text-lg font-bold leading-tight" style={{ color: 'var(--cr-text-1)' }}>
        {fmt(count)}
      </span>
      <span className="text-[10px] sm:text-[11px] mt-0.5 font-medium" style={{ color: 'var(--cr-text-muted)' }}>
        {label}
      </span>
    </motion.div>
  )
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────

function RecipeCard({ r, idx, onClick }: { r: ProfileRecipe; idx: number; onClick?: () => void }) {
  const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length]
  const diffKey  = r.difficulty ?? ''

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ scale: 1.025, y: -4 }}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {r.coverImage ? (
          <img
            src={r.coverImage}
            alt={r.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-4xl opacity-60">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-all duration-300 flex items-center justify-center gap-2.5 opacity-0 group-hover:opacity-100">
          <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/35">
            <Heart className="w-4 h-4 text-white" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/35">
            <Play className="w-4 h-4 text-white fill-white" />
          </button>
        </div>
        {diffKey && (
          <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${DIFF_STYLE[diffKey] ?? ''}`}>
            {DIFF_LABEL[diffKey] ?? diffKey}
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-sm leading-tight line-clamp-1" style={{ color: 'var(--cr-text-1)' }}>
          {r.title}
        </h4>
        <div className="flex items-center justify-between mt-1.5">
          <span className="flex items-center gap-1" style={{ color: 'var(--cr-text-muted)' }}>
            <Clock className="w-3 h-3" />
            <span className="text-xs">{fmtTime((r.cookTime ?? 0) + (r.prepTime ?? 0))}</span>
          </span>
          <span className="flex items-center gap-1" style={{ color: 'var(--cr-text-muted)' }}>
            <Heart className="w-3 h-3" />
            <span className="text-xs">{fmt(r.likeCount)}</span>
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── ReelCard

function ReelCard({ r, idx, onClick }: { r: ProfileReel; idx: number; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length]

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ scale: 1.03 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      className="relative rounded-xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: '9/16' }}
    >
      {/* Video as cover — autoplay muted loop */}
      <video
        src={r.videoUrl}
        autoPlay
        muted
        loop
        playsInline
        poster={r.thumbnailUrl ?? undefined}
        className="absolute inset-0 w-full h-full object-cover"
        onError={e => { (e.currentTarget as HTMLVideoElement).style.display = 'none' }}
      />
      {/* Gradient shown while video loads or if URL is missing */}
      {!r.videoUrl && (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-3xl opacity-50">🎬</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <motion.div
        animate={{ scale: hovered ? 1.15 : 1, opacity: hovered ? 0.95 : 0.65 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
      </motion.div>
      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {fmtDuration(r.duration)}
      </div>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-0 left-0 right-0 p-2"
          >
            <p className="text-white text-[11px] font-semibold leading-tight line-clamp-1 mb-1">{r.title}</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-white/80 text-[10px]">
                <Eye className="w-3 h-3" /> {fmt(r.viewCount)}
              </span>
              <span className="flex items-center gap-0.5 text-white/80 text-[10px]">
                <Heart className="w-3 h-3" /> {fmt(r.likeCount)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!hovered && (
        <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
          <Eye className="w-3 h-3 text-white/65" />
          <span className="text-[10px] text-white/65">{fmt(r.viewCount)}</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── CardSkeleton ─────────────────────────────────────────────────────────────

function RecipeSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: 'var(--cr-bg-card)' }}>
      <div className="aspect-[4/3]" style={{ background: 'var(--cr-border)' }} />
      <div className="p-3 space-y-2">
        <div className="h-3.5 rounded-full w-3/4" style={{ background: 'var(--cr-border)' }} />
        <div className="h-3 rounded-full w-1/2" style={{ background: 'var(--cr-border)' }} />
      </div>
    </div>
  )
}

function ReelSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse"
      style={{ aspectRatio: '9/16', background: 'var(--cr-border)' }}
    />
  )
}

// ─── EmptyState 

function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        className="text-5xl mb-4 block"
      >
        {emoji}
      </motion.span>
      <p className="text-base font-semibold" style={{ color: 'var(--cr-text-2)' }}>{title}</p>
      <p className="text-sm mt-1 text-center max-w-xs" style={{ color: 'var(--cr-text-muted)' }}>{sub}</p>
    </motion.div>
  )
}

// ─── AvatarFallback 

function AvatarFallback({ name }: { name: string }) {
  const initials = (name ?? '').split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div
      className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-bold"
      style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
    >
      {initials}
    </div>
  )
}

// ─── LoadMoreButton 

function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="flex justify-center mt-6">
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold border transition-colors disabled:opacity-50"
        style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' }}
      >
        {loading ? (
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {loading ? 'Loading…' : 'Load more'}
      </motion.button>
    </div>
  )
}

// ─── PublicProfilePage (main export) 

export function PublicProfilePage({
  user,
  stats,
  initialRecipes,
  initialReels,
  totalRecipes,
  totalReels,
  currentUserId,
  currentUserName,
  initialFollowStatus,
  initialIsFollowedBy,
  isPrivate,
}: PublicProfilePageProps) {
  const router = useRouter()
  const { theme } = useTheme()

  const isLoggedOut = !currentUserId
  const rawUsername = user.username.replace(/^@/, '')
  const [showLoginPrompt, setShowLoginPrompt] = useState(isLoggedOut)

  const [activeTab,    setActiveTab]    = useState<PublicTab>('Recipes')
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>(initialFollowStatus)
  const [isFollowedBy] = useState(initialIsFollowedBy)
  const [followersCount, setFollowersCount] = useState(stats.followers)
  const [followPending,  setFollowPending]  = useState(false)

  const isFollowing = followStatus === 'accepted'
  const isPending   = followStatus === 'pending'
  const [socialModal,    setSocialModal]    = useState<SocialListType | null>(null)

  // Tab content state
  const [recipes,          setRecipes]          = useState<ProfileRecipe[]>(initialRecipes)
  const [recipesPage,      setRecipesPage]       = useState(1)
  const [recipesLoading,   setRecipesLoading]    = useState(false)
  const [hasMoreRecipes,   setHasMoreRecipes]    = useState(totalRecipes > initialRecipes.length)

  const [reels,            setReels]             = useState<ProfileReel[]>(initialReels)
  const [reelsPage,        setReelsPage]         = useState(1)
  const [reelsLoading,     setReelsLoading]      = useState(false)
  const [hasMoreReels,     setHasMoreReels]      = useState(totalReels > initialReels.length)

  const [taggedLoaded,     setTaggedLoaded]      = useState(false)

  const isFriend = isFollowing && isFollowedBy

  // ── Follow / Unfollow / Request / Withdraw

  const handleFollow = useCallback(async () => {
    if (!currentUserId) {
      router.push(`/auth/login?next=${encodeURIComponent(`/user/${rawUsername}`)}`)
      return
    }
    if (followPending) return
    setFollowPending(true)

    if (followStatus === 'none') {
      try {
        const res = await fetch('/api/social/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: user.id }),
        })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        const next: 'pending' | 'accepted' = data.status === 'pending' ? 'pending' : 'accepted'
        setFollowStatus(next)
        if (next === 'accepted') setFollowersCount(c => c + 1)
      } catch { /* no-op */ }
    } else {
      // Unfollow or withdraw request
      const prev = followStatus
      setFollowStatus('none')
      if (prev === 'accepted') setFollowersCount(c => c - 1)
      try {
        const res = await fetch('/api/social/follow', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: user.id }),
        })
        if (!res.ok) {
          setFollowStatus(prev)
          if (prev === 'accepted') setFollowersCount(c => c + 1)
        }
      } catch {
        setFollowStatus(prev)
        if (prev === 'accepted') setFollowersCount(c => c + 1)
      }
    }

    setFollowPending(false)
  }, [currentUserId, followPending, followStatus, router, user.id, rawUsername])

  // ── Load more recipes ────────────────────────────────────────────────────────

  const loadMoreRecipes = useCallback(async () => {
    if (recipesLoading || !hasMoreRecipes) return
    const next = recipesPage + 1
    setRecipesLoading(true)
    try {
      const res = await fetch(`/api/users/${user.username.replace('@', '')}/recipes?page=${next}&limit=9`)
      if (!res.ok) return
      const data = await res.json()
      setRecipes(prev => [...prev, ...data.recipes])
      setRecipesPage(next)
      setHasMoreRecipes(next < data.totalPages)
    } finally {
      setRecipesLoading(false)
    }
  }, [recipesLoading, hasMoreRecipes, recipesPage, user.username])

  // ── Load more reels ──────────────────────────────────────────────────────────

  const loadMoreReels = useCallback(async () => {
    if (reelsLoading || !hasMoreReels) return
    const next = reelsPage + 1
    setReelsLoading(true)
    try {
      const res = await fetch(`/api/users/${user.username.replace('@', '')}/reels?page=${next}&limit=12`)
      if (!res.ok) return
      const data = await res.json()
      setReels(prev => [...prev, ...data.reels])
      setReelsPage(next)
      setHasMoreReels(next < data.totalPages)
    } finally {
      setReelsLoading(false)
    }
  }, [reelsLoading, hasMoreReels, reelsPage, user.username])

  // ── Follow button styles ─────────────────────────────────────────────────────

  const followBtnStyle = isPending
    ? { border: '1px solid var(--cr-border)', color: 'var(--cr-text-muted)', background: 'var(--cr-bg-card)' }
    : isFriend
      ? { background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981', color: '#10b981' }
      : isFollowing
        ? { border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' }
        : { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }

  const followBtnLabel = isPending ? 'Requested' : isFriend ? 'Friends' : isFollowing ? 'Following' : 'Follow'
  const FollowIcon = isPending ? Clock : isFriend ? Users : isFollowing ? UserCheck : UserPlus

  // ── Share profile ────────────────────────────────────────────────────────────

  const [shareCopied,    setShareCopied]    = useState(false)
  const [messagePending, setMessagePending] = useState(false)
  const [reportOpen,     setReportOpen]     = useState(false)

  const handleMessage = useCallback(async () => {
    if (messagePending) return
    setMessagePending(true)
    try {
      const res = await fetch('/api/messages/conversations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId: user.id }),
      })
      if (!res.ok) return
      const { conversationId } = await res.json()
      router.push(`/messages?conv=${conversationId}`)
    } catch { /* ignore */ }
    finally { setMessagePending(false) }
  }, [user.id, router, messagePending])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: `${user.name} on CookReels`, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
    } catch {
      // user cancelled share sheet — do nothing
    }
  }, [user.name])

  const profileContent = (
    <>
      <div className="max-w-4xl mx-auto">

        {/* ── COVER + AVATAR ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* Cover banner */}
          <div
            className="relative w-full h-36 sm:h-52 rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a1a1b 0%, #2B2B2D 25%, #3d2810 55%, rgba(245,197,24,0.55) 100%)' }}
          >
            {user.backgroundPicture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.backgroundPicture}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* Subtle darkening overlay so text/avatar on top remains readable */}
            <div className="absolute inset-0 bg-black/25 pointer-events-none" />
            {!user.backgroundPicture && (
              <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
                <span className="absolute top-4 right-8 text-5xl sm:text-7xl opacity-25">🍳</span>
                <span className="absolute bottom-3 left-10 text-3xl sm:text-5xl opacity-20">🌶️</span>
                <span className="absolute top-5 left-1/3 text-4xl sm:text-6xl opacity-15">🍜</span>
              </div>
            )}
          </div>

          {/* Avatar + action buttons */}
          <div className="relative flex items-end justify-between px-4 -mt-10 sm:-mt-14">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-full p-[3px] animate-pulse-glow-yellow"
                style={{ background: 'linear-gradient(135deg, #F5C518, #FF9F1C, #F5C518)' }}
              >
                <div className="w-full h-full rounded-full overflow-hidden" style={{ border: '3px solid var(--cr-bg-card)' }}>
                  {user.avatar
                    ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    : <AvatarFallback name={user.name} />
                  }
                </div>
              </div>
              {user.isOnline && (
                <div
                  className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 bg-emerald-500 animate-green-pulse"
                  style={{ borderColor: 'var(--cr-bg-card)' }}
                />
              )}
            </div>

            {/* Desktop action buttons */}
            <div className="hidden sm:flex items-center gap-2 pb-3">
              <motion.button
                onClick={handleFollow}
                disabled={followPending}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-md transition-all disabled:opacity-70"
                style={followBtnStyle}
              >
                {followPending
                  ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  : <FollowIcon className="w-3.5 h-3.5" />
                }
                {followBtnLabel}
              </motion.button>
              <motion.button
                onClick={handleMessage}
                disabled={messagePending}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border transition-colors disabled:opacity-60"
                style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' }}
              >
                {messagePending
                  ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  : <MessageCircle className="w-3.5 h-3.5" />
                }
                Message
              </motion.button>
              <motion.button
                onClick={handleShare}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="w-10 h-10 rounded-full flex items-center justify-center border transition-all"
                style={{ borderColor: shareCopied ? 'var(--cr-accent)' : 'var(--cr-border)', background: shareCopied ? 'var(--cr-accent-soft)' : 'var(--cr-bg-card)' }}
                title={shareCopied ? 'Link copied!' : 'Share profile'}
              >
                {shareCopied
                  ? <span className="text-[10px] font-bold" style={{ color: 'var(--cr-accent)' }}>✓</span>
                  : <Share2 className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
                }
              </motion.button>
              {currentUserId && (
                <motion.button
                  onClick={() => setReportOpen(true)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center border transition-all"
                  style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
                  title="Report user"
                >
                  <Flag className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── PROFILE INFO ────────────────────────────────── */}
        <motion.div className="px-4 mt-3 sm:mt-4" {...fadeUp(0.1)}>
          {/* Name + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="text-xl sm:text-2xl font-bold"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--cr-text-1)' }}
            >
              {user.name}
            </h1>
            {user.verified && (
              <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" style={{ color: 'var(--cr-accent)' }} />
            )}
            {user.topChef && (
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
              >
                👑 Top Chef
              </span>
            )}
          </div>

          {/* Username */}
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--cr-text-muted)' }}>
            {user.username}
          </p>

          {/* Bio */}
          {user.bio && (
            <p className="text-sm mt-2 leading-relaxed max-w-lg" style={{ color: 'var(--cr-text-2)' }}>
              {user.bio}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
            {user.cuisineSpecialty && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--cr-text-muted)' }}>
                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                {user.cuisineSpecialty}
              </span>
            )}
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)' }}
            >
              {user.level}
            </span>
          </div>

          {/* Mobile action buttons */}
          <div className="flex sm:hidden gap-2 mt-4">
            <motion.button
              onClick={handleFollow}
              disabled={followPending}
              whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-70"
              style={followBtnStyle}
            >
              {followPending
                ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                : <FollowIcon className="w-4 h-4" />
              }
              {followBtnLabel}
            </motion.button>
            <motion.button
              onClick={handleMessage}
              disabled={messagePending}
              whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold border disabled:opacity-60"
              style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' }}
            >
              {messagePending
                ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                : <MessageCircle className="w-4 h-4" />
              }
              Message
            </motion.button>
            <motion.button
              onClick={handleShare}
              whileTap={{ scale: 0.97 }}
              className="w-11 h-11 rounded-full flex items-center justify-center border"
              style={{ borderColor: shareCopied ? 'var(--cr-accent)' : 'var(--cr-border)', background: shareCopied ? 'var(--cr-accent-soft)' : 'var(--cr-bg-card)' }}
              title={shareCopied ? 'Link copied!' : 'Share profile'}
            >
              {shareCopied
                ? <span className="text-[10px] font-bold" style={{ color: 'var(--cr-accent)' }}>✓</span>
                : <Share2 className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
              }
            </motion.button>
            {currentUserId && (
              <motion.button
                onClick={() => setReportOpen(true)}
                whileTap={{ scale: 0.97 }}
                className="w-11 h-11 rounded-full flex items-center justify-center border"
                style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
                title="Report user"
              >
                <Flag className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* ── STATS ROW ────────────────────────────────────── */}
        <motion.div
          className="mx-4 mt-5 flex items-center justify-between py-4 px-2 sm:px-4 rounded-2xl"
          style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
          {...fadeUp(0.15)}
        >
          {[
            { label: 'Recipes',   value: stats.recipes,   type: null              },
            { label: 'Reels',     value: stats.reels,     type: null              },
            { label: 'Followers', value: followersCount,  type: 'followers' as SocialListType },
            { label: 'Following', value: stats.following, type: 'following' as SocialListType },
            { label: 'Friends',   value: stats.friends,   type: 'friends'  as SocialListType },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center">
              {s.type ? (
                <motion.button
                  whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setSocialModal(s.type)}
                  className="flex flex-col items-center outline-none"
                >
                  <AnimatedStat value={s.value} label={s.label} />
                </motion.button>
              ) : (
                <AnimatedStat value={s.value} label={s.label} />
              )}
              {i < arr.length - 1 && (
                <div className="h-7 w-px mx-0.5 sm:mx-1 shrink-0" style={{ background: 'var(--cr-border)' }} />
              )}
            </div>
          ))}
        </motion.div>

        {/* ── PRIVATE ACCOUNT GATE ────────────────────────── */}
        {isPrivate && followStatus !== 'accepted' && (
          <motion.div
            className="flex flex-col items-center py-16 px-4 mt-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.2 }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
            >
              <Lock className="w-9 h-9" style={{ color: 'var(--cr-text-muted)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}>
              This account is private
            </h2>
            <p className="text-sm text-center max-w-xs leading-relaxed" style={{ color: 'var(--cr-text-muted)' }}>
              {followStatus === 'pending'
                ? "Your follow request is pending. Once approved, you'll be able to see their recipes and reels."
                : 'Follow this account to see their recipes and reels.'}
            </p>
          </motion.div>
        )}

        {/* ── STICKY TAB NAVIGATION ────────────────────────── */}
        {(!isPrivate || followStatus === 'accepted') && <div
          className="sticky top-0 z-20 mt-6 border-b"
          style={{ background: 'var(--cr-bg-surface)', borderColor: 'var(--cr-border)' }}
        >
          <div className="flex overflow-x-auto scrollbar-none">
            {PUB_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === 'Tagged') setTaggedLoaded(true) }}
                className="relative flex items-center gap-1.5 px-4 sm:px-6 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors"
                style={{ color: activeTab === tab ? 'var(--cr-accent)' : 'var(--cr-text-muted)' }}
              >
                {tab === 'Recipes' && <ChefHat className="w-3.5 h-3.5" />}
                {tab === 'Reels'   && <Film    className="w-3.5 h-3.5" />}
                {tab === 'Tagged'  && <Tag     className="w-3.5 h-3.5" />}
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="pub-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full"
                    style={{ background: 'var(--cr-accent)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>}

        {/* ── TAB CONTENT ──────────────────────────────────── */}
        {(!isPrivate || followStatus === 'accepted') && <div className="mt-5 px-4 pb-8">
          <AnimatePresence mode="wait">

            {/* RECIPES */}
            {activeTab === 'Recipes' && (
              <motion.div
                key="recipes"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                {recipes.length === 0 ? (
                  <EmptyState emoji="🍽️" title="No recipes yet" sub="This chef hasn't shared any recipes yet" />
                ) : (
                  <>
                    <motion.div
                      variants={staggerContainer(0.04)}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
                    >
                      {recipes.map((r, i) => <RecipeCard key={r.id} r={r} idx={i} onClick={() => router.push(`/recipe/${r.id}`)} />)}
                    </motion.div>
                    {hasMoreRecipes && (
                      <LoadMoreButton onClick={loadMoreRecipes} loading={recipesLoading} />
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* REELS */}
            {activeTab === 'Reels' && (
              <motion.div
                key="reels"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                {reels.length === 0 ? (
                  <EmptyState emoji="🎬" title="No reels yet" sub="This chef hasn't posted any cooking reels yet" />
                ) : (
                  <>
                    <motion.div
                      variants={staggerContainer(0.03)}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3"
                    >
                      {reels.map((r, i) => <ReelCard key={r.id} r={r} idx={i} onClick={() => router.push(`/reel/${r.id}`)} />)}
                    </motion.div>
                    {hasMoreReels && (
                      <LoadMoreButton onClick={loadMoreReels} loading={reelsLoading} />
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* TAGGED */}
            {activeTab === 'Tagged' && (
              <motion.div
                key="tagged"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28 }}
              >
                <EmptyState
                  emoji="🏷️"
                  title="No tagged posts yet"
                  sub="Posts where this chef is tagged will appear here"
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>}

      </div>

      {/* Social list modal */}
      <SocialListModal
        isOpen={socialModal !== null}
        onClose={() => setSocialModal(null)}
        title={socialModal === 'followers' ? 'Followers' : socialModal === 'following' ? 'Following' : 'Friends'}
        username={user.username}
        listType={socialModal ?? 'followers'}
        currentUserId={currentUserId}
      />

      {/* Report user modal */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="USER"
        targetId={user.id}
      />
    </>
  )

  if (isLoggedOut) {
    return (
      <>
        <div className="min-h-screen overflow-y-auto dark:bg-[#1E1E1F]" style={{ background: 'var(--cr-bg-main)' }}>
          <div className="px-4 sm:px-6 pt-6 pb-10">
            {profileContent}
          </div>
        </div>
        <LoginPromptModal
          isOpen={showLoginPrompt}
          onClose={() => setShowLoginPrompt(false)}
          redirectTo={`/user/${rawUsername}`}
          userName={user.name}
        />
      </>
    )
  }

  return (
    <DashboardLayout username={currentUserName}>
      {profileContent}
    </DashboardLayout>
  )
}
