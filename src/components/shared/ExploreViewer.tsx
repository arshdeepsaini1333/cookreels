'use client'

import {
  useState, useEffect, useRef, useCallback, memo,
} from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Heart, MessageCircle, Share2, Bookmark, BadgeCheck,
  ChevronLeft, ChevronRight, Play, Volume2, VolumeX,
  Clock, ChefHat, Flame,
} from 'lucide-react'
import { useReelLikes }     from '@/hooks/useReelLikes'
import { useReelComments }  from '@/hooks/useReelComments'
import { useRecipeLikes }   from '@/hooks/useRecipeLikes'
import { useRecipeComments } from '@/hooks/useRecipeComments'
import { CommentList, CommentInput } from '@/components/shared/CommentSection'
import { ShareModal } from '@/components/shared/ShareModal'
import { UserAvatar } from '@/components/shared/UserAvatar'

// ─── Public types (consumed by ExplorePage) ───────────────────────────────────

export interface ExploreUser {
  id: string
  username: string
  firstName: string
  lastName: string
  profileImage: string | null
  isVerified?: boolean
}

export interface ExploreRecipe {
  id: string
  title: string
  coverImage: string | null
  cookTime: number | null
  prepTime: number | null
  likeCount: number
  difficulty: string | null
  description: string | null
  servings: number | null
  createdAt: string
  user: ExploreUser
}

export interface ExploreReel {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  likeCount: number
  viewCount: number
  duration: number | null
  gradient: string | null
  emoji: string | null
  createdAt: string
  user: ExploreUser
}

export type ExploreItem =
  | { type: 'recipe'; data: ExploreRecipe }
  | { type: 'reel';   data: ExploreReel }

export interface ExploreViewerProps {
  items: ExploreItem[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
  currentUserAvatar?: string | null
  currentUserName?: string
  currentUserId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtTime(min: number | null | undefined) {
  if (!min) return null
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function userName(u: ExploreUser) {
  return `${u.firstName} ${u.lastName}`.trim() || u.username
}

const DIFF_BADGE: Record<string, { label: string; cls: string }> = {
  EASY:   { label: 'Easy',   cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  MEDIUM: { label: 'Medium', cls: 'bg-amber-500/20   text-amber-300   border border-amber-500/30'   },
  HARD:   { label: 'Hard',   cls: 'bg-red-500/20     text-red-300     border border-red-500/30'     },
}

const FALLBACK_GRADS = [
  'from-orange-500 to-rose-600',  'from-amber-500 to-orange-700',
  'from-pink-400 to-fuchsia-600', 'from-emerald-500 to-teal-700',
  'from-red-500 to-orange-600',   'from-violet-500 to-purple-600',
]

// ─── Slide variants ───────────────────────────────────────────────────────────

const slideH = {
  enter: (d: number) => ({ x: d >= 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d >= 0 ? '-100%' : '100%', opacity: 0 }),
}

const slideV = {
  enter: (d: number) => ({ y: d >= 0 ? '100%' : '-100%' }),
  center: { y: 0 },
  exit:  (d: number) => ({ y: d >= 0 ? '-100%' : '100%' }),
}

const springTrans = { type: 'spring' as const, stiffness: 360, damping: 38 }


// ─── VideoPanel ───────────────────────────────────────────────────────────────

const VideoPanel = memo(function VideoPanel({
  reel,
  onDoubleTap,
}: {
  reel: ExploreReel
  onDoubleTap: () => void
}) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const lastTap    = useRef(0)
  const [muted,   setMuted]   = useState(true)
  const [paused,  setPaused]  = useState(false)
  const [heartAt, setHeartAt] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.play().catch(() => setPaused(true))
    return () => { v.pause() }
  }, [])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now()
    if (now - lastTap.current < 340) {
      const rect = e.currentTarget.getBoundingClientRect()
      setHeartAt({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setTimeout(() => setHeartAt(null), 900)
      onDoubleTap()
    } else {
      const v = videoRef.current
      if (!v) return
      if (v.paused) { v.play().catch(() => {}); setPaused(false) }
      else          { v.pause();                 setPaused(true)  }
    }
    lastTap.current = now
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden cursor-pointer" onClick={handleClick}>
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl ?? undefined}
        muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />

      {/* Dark gradient for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 pointer-events-none" />

      {/* Paused overlay */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.75 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap heart */}
      <AnimatePresence>
        {heartAt && (
          <motion.div
            key="ht"
            initial={{ opacity: 0, scale: 0.3, y: 0 }}
            animate={{ opacity: 1, scale: 1.6, y: -20 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute pointer-events-none"
            style={{ left: heartAt.x - 28, top: heartAt.y - 28 }}
          >
            <Heart className="w-14 h-14 fill-white text-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute button */}
      <button
        onClick={toggleMute}
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center z-10 hover:bg-black/70 transition-colors"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
      </button>
    </div>
  )
})

// ─── RecipeImagePanel ─────────────────────────────────────────────────────────

function RecipeImagePanel({ recipe, idx }: { recipe: ExploreRecipe; idx: number }) {
  const grad = FALLBACK_GRADS[idx % FALLBACK_GRADS.length]
  const diff = recipe.difficulty ? DIFF_BADGE[recipe.difficulty] : null

  return (
    <div className="relative w-full h-full overflow-hidden">
      {recipe.coverImage ? (
        <img
          src={recipe.coverImage}
          alt={recipe.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${grad} flex items-center justify-center`}>
          <span className="text-8xl opacity-50">🍽️</span>
        </div>
      )}
      {/* Gradients for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
      {diff && (
        <div className="absolute top-3 left-3 z-10">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${diff.cls}`}>
            {diff.label}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── CreatorRow (desktop right panel header) ──────────────────────────────────

function CreatorRow({
  user, following, onToggleFollow, onClose,
}: {
  user: ExploreUser
  following: boolean
  onToggleFollow: () => void
  onClose: () => void
}) {
  const name = userName(user)
  const router = useRouter()

  function goToProfile() {
    onClose()
    router.push(`/user/${user.username}`)
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b"
      style={{ borderColor: 'var(--cr-border)' }}
    >
      <button
        onClick={goToProfile}
        className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
      >
        <div
          className="ring-2 ring-offset-2 rounded-full flex-shrink-0"
          style={{ '--tw-ring-color': 'var(--cr-accent)', '--tw-ring-offset-color': 'var(--cr-bg-card)' } as React.CSSProperties}
        >
          <UserAvatar src={user.profileImage} name={name} size="md" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--cr-text-1)' }}>{name}</span>
            {user.isVerified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--cr-accent)' }} />}
          </div>
          <span className="text-[11px]" style={{ color: 'var(--cr-text-muted)' }}>@{user.username}</span>
        </div>
      </button>
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={onToggleFollow}
        className="flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors"
        style={following
          ? { background: 'var(--cr-bg-surface)', borderColor: 'var(--cr-border)', color: 'var(--cr-text-muted)' }
          : { background: 'transparent', borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)' }
        }
      >
        {following ? 'Following' : 'Follow'}
      </motion.button>
      <button
        onClick={onClose}
        aria-label="Close"
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
      </button>
    </div>
  )
}

// ─── ActionBar ────────────────────────────────────────────────────────────────

function ActionBar({
  liked, likeCount, onLike,
  commentCount,
  saved, onSave,
  onShare,
  onCommentFocus,
}: {
  liked: boolean; likeCount: number; onLike: () => void
  commentCount: number
  saved: boolean; onSave: () => void
  onShare: () => void
  onCommentFocus?: () => void
}) {
  return (
    <div className="flex items-center px-3 py-2">
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={onLike}
        className="flex items-center gap-1.5 px-2 py-2 rounded-full"
        style={{ color: liked ? '#F5C518' : 'var(--cr-text-muted)' }}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <motion.span animate={{ scale: liked ? [1, 1.45, 1] : 1 }} transition={{ duration: 0.22 }}>
          <Heart className="w-5 h-5" style={{ fill: liked ? '#F5C518' : 'transparent', color: liked ? '#F5C518' : 'var(--cr-text-muted)' }} />
        </motion.span>
        <span className="text-xs font-semibold tabular-nums">{fmt(likeCount)}</span>
      </motion.button>

      <button
        onClick={onCommentFocus}
        className="flex items-center gap-1.5 px-2 py-2 rounded-full"
        style={{ color: 'var(--cr-text-muted)' }}
        aria-label="Comments"
      >
        <MessageCircle className="w-5 h-5" />
        {commentCount > 0 && (
          <span className="text-xs font-semibold tabular-nums">{fmt(commentCount)}</span>
        )}
      </button>

      <div className="flex-1" />

      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={onSave}
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{ color: saved ? '#F5C518' : 'var(--cr-text-muted)' }}
        aria-label={saved ? 'Unsave' : 'Save'}
      >
        <Bookmark className="w-5 h-5" style={{ fill: saved ? '#F5C518' : 'transparent', color: saved ? '#F5C518' : 'var(--cr-text-muted)' }} />
      </motion.button>

      <button
        onClick={onShare}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-70"
        style={{ color: 'var(--cr-text-muted)' }}
        aria-label="Share"
      >
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border"
      style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-muted)' }}
    >
      {icon}{label}
    </span>
  )
}

// ─── Desktop Reel content (right panel body) ──────────────────────────────────

function ReelBody({ reel, likeCount, commentCount }: { reel: ExploreReel; likeCount: number; commentCount: number }) {
  return (
    <div className="px-4 pt-4 pb-3 space-y-2">
      <h2 className="font-bold text-base leading-snug" style={{ fontFamily: 'var(--font-heading)', color: 'var(--cr-text-1)' }}>
        {reel.title}
      </h2>
      {reel.description && (
        <p className="text-sm leading-snug" style={{ color: 'var(--cr-text-2)' }}>{reel.description}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Pill icon={<Heart className="w-3 h-3" />} label={`${fmt(likeCount)} likes`} />
        <Pill icon={<MessageCircle className="w-3 h-3" />} label={`${commentCount} comments`} />
      </div>
    </div>
  )
}

// ─── Desktop Recipe content (right panel body) ────────────────────────────────

function RecipeBody({ recipe }: { recipe: ExploreRecipe }) {
  const totalTime = (recipe.cookTime ?? 0) + (recipe.prepTime ?? 0)
  return (
    <div className="px-4 pt-4 pb-3 space-y-3">
      <h2 className="font-bold text-base leading-snug" style={{ fontFamily: 'var(--font-heading)', color: 'var(--cr-text-1)' }}>
        {recipe.title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {totalTime > 0 && <Pill icon={<Clock className="w-3 h-3" />} label={fmtTime(totalTime)!} />}
        {recipe.cookTime && <Pill icon={<ChefHat className="w-3 h-3" />} label={`Cook ${fmtTime(recipe.cookTime)}`} />}
        {recipe.servings && <Pill icon={<Flame className="w-3 h-3" />} label={`${recipe.servings} servings`} />}
      </div>
      {recipe.description && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--cr-text-2)' }}>{recipe.description}</p>
      )}
    </div>
  )
}

// ─── Nav arrow buttons (outside modal, desktop) ───────────────────────────────

function NavArrow({ dir, onClick, label }: { dir: 'prev' | 'next'; onClick: () => void; label: string }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: dir === 'prev' ? 10 : -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      aria-label={label}
      className={`fixed ${dir === 'prev' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2
        w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm
        items-center justify-center hover:bg-white/30 transition-colors hidden md:flex`}
      style={{ zIndex: 10000 }}
    >
      {dir === 'prev'
        ? <ChevronLeft className="w-6 h-6 text-white" />
        : <ChevronRight className="w-6 h-6 text-white" />
      }
    </motion.button>
  )
}

// ─── ExploreViewer ────────────────────────────────────────────────────────────

export function ExploreViewer({
  items, initialIndex, isOpen, onClose,
  currentUserAvatar, currentUserName, currentUserId,
}: ExploreViewerProps) {
  const router = useRouter()

  const [mounted,      setMounted]      = useState(false)
  const [index,        setIndex]        = useState(initialIndex)
  const [direction,    setDirection]    = useState(0)
  const [following,    setFollowing]    = useState<Record<string, boolean>>({})
  const [saved,        setSaved]        = useState<Record<string, boolean>>({})
  const [shareOpen,    setShareOpen]    = useState(false)
  const [isMobile,     setIsMobile]     = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : true,
  )
  const commentInputRef = useRef<HTMLDivElement>(null)
  const touchStart      = useRef<{ x: number; y: number } | null>(null)
  const origUrlRef      = useRef('')
  const modalRef        = useRef<HTMLDivElement>(null)

  const [me, setMe] = useState<{ firstName: string; lastName: string; profileImage: string | null } | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Fetch current user once so comment input shows the commenter's avatar/initials
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.firstName) setMe(d) })
      .catch(() => {})
  }, [])

  const resolvedAvatar = currentUserAvatar ?? me?.profileImage ?? null
  const resolvedName   = currentUserName   ?? (me ? `${me.firstName} ${me.lastName}` : 'You')

  // Sync index when caller opens at a different position
  useEffect(() => {
    if (isOpen) {
      setIndex(initialIndex)
      setDirection(0)
    }
  }, [isOpen, initialIndex])

  const item    = items[index]
  const isReel  = item?.type === 'reel'
  const reel    = item?.type === 'reel'   ? (item.data as ExploreReel)   : null
  const recipe  = item?.type === 'recipe' ? (item.data as ExploreRecipe) : null
  const itemUser = item?.data.user

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Save the page URL on open so it can be restored when the modal closes.
  useEffect(() => {
    if (isOpen) {
      origUrlRef.current = window.location.pathname + window.location.search
    } else {
      window.history.replaceState(null, '', origUrlRef.current || window.location.pathname)
    }
  }, [isOpen])

  // Keep URL in sync with the active item for shareable deep-links.
  // replaceState is intentional — modal navigation should not pollute history.
  useEffect(() => {
    if (!isOpen || !item) return
    const param = item.type === 'recipe' ? `recipeId=${item.data.id}` : `reelId=${item.data.id}`
    window.history.replaceState(null, '', `${window.location.pathname}?${param}`)
  }, [isOpen, index]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= items.length) return
    // Pause any playing videos immediately before the exit animation starts
    modalRef.current?.querySelectorAll('video').forEach(v => v.pause())
    setDirection(next > index ? 1 : -1)
    setIndex(next)
  }, [index, items.length])

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index])
  const goNext = useCallback(() => goTo(index + 1), [goTo, index])

  const hasPrev = index > 0
  const hasNext = index < items.length - 1

  // Keyboard
  useEffect(() => {
    if (!isOpen) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowLeft')   goPrev()
      if (e.key === 'ArrowRight')  goNext()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [isOpen, onClose, goPrev, goNext])

  // Touch swipe (mobile — vertical; desktop — horizontal fallback)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = touchStart.current.x - e.changedTouches[0].clientX
    const dy = touchStart.current.y - e.changedTouches[0].clientY
    const absDx = Math.abs(dx), absDy = Math.abs(dy)
    // On mobile prefer vertical swipe; on desktop prefer horizontal
    if (absDy > absDx && absDy > 60) {
      if (dy > 0) goNext(); else goPrev()
    } else if (absDx > absDy && absDx > 60) {
      if (dx > 0) goNext(); else goPrev()
    }
    touchStart.current = null
  }

  // ── Hooks (always called, gated by active flag) ─────────────────────────────

  const reelLikes = useReelLikes(
    reel?.id ?? '', reel?.likeCount ?? 0, isReel && isOpen
  )
  const reelCmts = useReelComments(
    reel?.id ?? '', isReel && isOpen
  )
  const recipeLikes = useRecipeLikes(
    recipe?.id ?? '', recipe?.likeCount ?? 0, !isReel && isOpen
  )
  const recipeCmts = useRecipeComments(
    recipe?.id ?? '', !isReel && isOpen
  )

  const liked        = isReel ? reelLikes.liked        : recipeLikes.liked
  const likeCount    = isReel ? reelLikes.likeCount    : recipeLikes.likeCount
  const toggleLike   = isReel ? reelLikes.toggle       : recipeLikes.toggle
  const comments     = isReel ? reelCmts.comments      : recipeCmts.comments
  const commentCount = isReel ? reelCmts.commentCount  : recipeCmts.commentCount
  const cmtLoading   = isReel ? reelCmts.loading       : recipeCmts.loading
  const cmtError     = isReel ? reelCmts.error         : recipeCmts.error
  const addComment   = isReel ? reelCmts.addComment    : recipeCmts.addComment
  const submitting   = isReel ? reelCmts.submitting    : recipeCmts.submitting

  // ── Derived state ───────────────────────────────────────────────────────────

  const userId      = itemUser?.id ?? ''
  const isFollowing = following[userId] ?? false
  const isSaved     = saved[item?.data.id ?? ''] ?? false

  const toggleFollow = () => setFollowing(f => ({ ...f, [userId]: !f[userId] }))
  const toggleSave   = () => setSaved(s => ({ ...s, [item.data.id]: !s[item.data.id] }))

  const handleShare = () => setShareOpen(true)

  const handleDoubleTapLike = () => { if (!liked) toggleLike() }

  // Preload adjacent video URLs
  useEffect(() => {
    const links: HTMLLinkElement[] = []
    const preload = (idx: number) => {
      const it = items[idx]
      if (it?.type !== 'reel') return
      const link = document.createElement('link')
      link.rel = 'preload'; link.as = 'video'; link.href = (it.data as ExploreReel).videoUrl
      document.head.appendChild(link)
      links.push(link)
    }
    preload(index - 1)
    preload(index + 1)
    return () => links.forEach(l => l.remove())
  }, [index, items])

  if (!mounted || !item) return null

  // ── Desktop right-panel shared footer ──────────────────────────────────────

  const rightPanelFooter = (
    <div className="flex-shrink-0 border-t" style={{ borderColor: 'var(--cr-border)' }}>
      <ActionBar
        liked={liked} likeCount={likeCount} onLike={toggleLike}
        commentCount={commentCount}
        saved={isSaved} onSave={toggleSave}
        onShare={handleShare}
        onCommentFocus={() => {
          const inp = commentInputRef.current?.querySelector('input')
          inp?.focus()
        }}
      />
      <div className="px-4 pb-4" ref={commentInputRef}>
        <CommentInput
          currentUserAvatar={resolvedAvatar}
          currentUserName={resolvedName}
          onSubmit={addComment}
          submitting={submitting}
        />
      </div>
    </div>
  )

  // ── Transition content key ──────────────────────────────────────────────────

  const contentKey = `${index}-${item.type}-${item.data.id}`

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ev-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
            style={{ zIndex: 9998 }}
          />

          {/* External nav arrows (desktop) */}
          {hasPrev && <NavArrow key="ev-prev" dir="prev" onClick={goPrev} label="Previous" />}
          {hasNext && <NavArrow key="ev-next" dir="next" onClick={goNext} label="Next" />}

          {/* Modal shell */}
          <motion.div
            key="ev-shell"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 310, damping: 30 }}
            className="fixed inset-0 flex items-stretch sm:items-center justify-center sm:p-4 md:p-6 pointer-events-none"
            style={{ zIndex: 9999 }}
            role="dialog" aria-modal="true" aria-label={item.data.title}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              ref={modalRef}
              onClick={e => e.stopPropagation()}
              className="
                pointer-events-auto relative w-full overflow-hidden
                flex flex-col
                h-[100dvh]
                sm:h-auto sm:rounded-3xl sm:max-w-xl sm:max-h-[88vh]
                md:max-w-none md:max-h-none md:h-[540px] md:flex-row md:rounded-3xl
                md:w-[820px]
              "
              style={{ background: 'var(--cr-bg-card)' }}
            >

              {/* ══════════════════════════════════════════
                  MOBILE LAYOUT
                  ══════════════════════════════════════════ */}
              <div className="flex flex-col w-full h-full md:hidden relative overflow-hidden">
                <AnimatePresence custom={direction} initial={false}>
                  <motion.div
                    key={contentKey}
                    custom={direction}
                    variants={slideV}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={springTrans}
                    className="absolute inset-0"
                  >
                    {isReel && reel ? (
                      /* ─ Mobile Reel: full-screen TikTok style ─ */
                      <div className="relative w-full h-full bg-black">
                        {isMobile && <VideoPanel reel={reel} onDoubleTap={handleDoubleTapLike} />}

                        {/* Bottom gradient */}
                        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />

                        {/* Back button */}
                        <button
                          onClick={onClose}
                          className="absolute top-4 left-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
                          aria-label="Back"
                        >
                          <ChevronLeft className="w-6 h-6 text-white" />
                        </button>


                        {/* Bottom overlay */}
                        <div className="absolute bottom-0 inset-x-0 z-20 flex items-end p-5 gap-4">
                          {/* Left: creator + caption */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { onClose(); router.push(`/user/${reel.user.username}`) }}
                                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                              >
                                <UserAvatar src={reel.user.profileImage} name={userName(reel.user)} size="xs" />
                                <span className="text-white font-semibold text-sm drop-shadow">@{reel.user.username}</span>
                              </button>
                              <button
                                onClick={toggleFollow}
                                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/60 text-white"
                              >
                                {isFollowing ? 'Following' : 'Follow'}
                              </button>
                            </div>
                            <p className="text-white font-semibold text-sm drop-shadow leading-snug line-clamp-2">{reel.title}</p>
                            {reel.description && (
                              <p className="text-white/70 text-xs drop-shadow line-clamp-1">{reel.description}</p>
                            )}
                          </div>

                          {/* Right: action stack */}
                          <div className="flex flex-col items-center gap-5 flex-shrink-0">
                            <motion.button whileTap={{ scale: 0.8 }} onClick={toggleLike} className="flex flex-col items-center gap-1">
                              <motion.span animate={{ scale: liked ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.22 }}>
                                <Heart className="w-7 h-7" style={{ fill: liked ? '#F5C518' : 'white', color: liked ? '#F5C518' : 'white' }} />
                              </motion.span>
                              <span className="text-white text-[11px] font-semibold">{fmt(likeCount)}</span>
                            </motion.button>

                            <button className="flex flex-col items-center gap-1" style={{ color: 'white' }}>
                              <MessageCircle className="w-7 h-7" />
                              <span className="text-white text-[11px] font-semibold">{fmt(commentCount)}</span>
                            </button>

                            <motion.button whileTap={{ scale: 0.8 }} onClick={toggleSave} className="flex flex-col items-center gap-1">
                              <Bookmark className="w-7 h-7" style={{ fill: isSaved ? '#F5C518' : 'white', color: isSaved ? '#F5C518' : 'white' }} />
                            </motion.button>

                            <button onClick={handleShare} style={{ color: 'white' }}>
                              <Share2 className="w-7 h-7" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : recipe ? (
                      /* ─ Mobile Recipe: full-screen scrollable ─ */
                      <div className="flex flex-col h-full" style={{ background: 'var(--cr-bg-card)' }}>

                        {/* Sticky header with back button */}
                        <div
                          className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-b"
                          style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
                        >
                          <button
                            onClick={onClose}
                            aria-label="Back"
                            className="w-9 h-9 flex items-center justify-center rounded-full -ml-1 active:bg-black/10 dark:active:bg-white/10"
                          >
                            <ChevronLeft className="w-6 h-6" style={{ color: 'var(--cr-text-1)' }} />
                          </button>
                          <button
                            onClick={() => { onClose(); router.push(`/user/${recipe.user.username}`) }}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                          >
                            <UserAvatar src={recipe.user.profileImage} name={userName(recipe.user)} size="xs" />
                            <span className="text-sm font-semibold truncate" style={{ color: 'var(--cr-text-1)' }}>
                              @{recipe.user.username}
                            </span>
                          </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">

                          {/* Hero image */}
                          <div className="relative w-full aspect-[4/3] flex-shrink-0 overflow-hidden bg-black">
                            <RecipeImagePanel recipe={recipe} idx={index} />
                            {hasPrev && (
                              <button onClick={goPrev} aria-label="Previous"
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
                                <ChevronLeft className="w-5 h-5 text-white" />
                              </button>
                            )}
                            {hasNext && (
                              <button onClick={goNext} aria-label="Next"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
                                <ChevronRight className="w-5 h-5 text-white" />
                              </button>
                            )}
                          </div>

                          {/* Action row */}
                          <div className="flex items-center justify-between px-2 pt-2">
                            <div className="flex">
                              <motion.button whileTap={{ scale: 0.8 }} onClick={toggleLike} className="p-2.5">
                                <Heart className="w-6 h-6" style={{ fill: liked ? '#F5C518' : 'transparent', color: liked ? '#F5C518' : 'var(--cr-text-1)' }} />
                              </motion.button>
                              <button className="p-2.5" style={{ color: 'var(--cr-text-1)' }}>
                                <MessageCircle className="w-6 h-6" />
                              </button>
                              <button onClick={handleShare} className="p-2.5" style={{ color: 'var(--cr-text-1)' }}>
                                <Share2 className="w-6 h-6" />
                              </button>
                            </div>
                            <motion.button whileTap={{ scale: 0.8 }} onClick={toggleSave} className="p-2.5">
                              <Bookmark className="w-6 h-6" style={{ fill: isSaved ? '#F5C518' : 'transparent', color: isSaved ? '#F5C518' : 'var(--cr-text-1)' }} />
                            </motion.button>
                          </div>

                          {/* Like count */}
                          <div className="px-4 pb-1">
                            <span className="text-sm font-bold" style={{ color: 'var(--cr-text-1)' }}>
                              {fmt(likeCount)} {likeCount === 1 ? 'like' : 'likes'}
                            </span>
                          </div>

                          {/* Title + meta + description */}
                          <div className="px-4 pb-3 space-y-2">
                            <h2 className="font-bold text-base leading-snug" style={{ color: 'var(--cr-text-1)' }}>
                              {recipe.title}
                            </h2>
                            <div className="flex flex-wrap gap-1.5">
                              {(recipe.cookTime ?? 0) + (recipe.prepTime ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                                      style={{ background: 'var(--cr-bg-surface)', color: 'var(--cr-text-muted)' }}>
                                  <Clock className="w-3 h-3" />{fmtTime((recipe.cookTime ?? 0) + (recipe.prepTime ?? 0))}
                                </span>
                              )}
                              {recipe.servings && (
                                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                                      style={{ background: 'var(--cr-bg-surface)', color: 'var(--cr-text-muted)' }}>
                                  <Flame className="w-3 h-3" />{recipe.servings} servings
                                </span>
                              )}
                            </div>
                            {recipe.description && (
                              <p className="text-sm leading-relaxed" style={{ color: 'var(--cr-text-2)' }}>{recipe.description}</p>
                            )}
                          </div>

                          {/* Divider */}
                          <div className="mx-4 border-t mb-3" style={{ borderColor: 'var(--cr-border)' }} />

                          {/* Comments */}
                          <div className="px-4 pb-6">
                            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--cr-text-1)' }}>Comments</p>
                            <CommentList comments={comments} loading={cmtLoading} error={cmtError} />
                          </div>

                        </div>{/* end scrollable body */}

                        {/* Pinned comment input */}
                        <div
                          className="flex-shrink-0 border-t px-4 py-3"
                          style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}
                        >
                          <CommentInput
                            currentUserAvatar={resolvedAvatar}
                            currentUserName={resolvedName}
                            onSubmit={addComment}
                            submitting={submitting}
                          />
                        </div>

                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ══════════════════════════════════════════
                  DESKTOP LAYOUT (md+)
                  ══════════════════════════════════════════ */}
              <div className="hidden md:flex w-full h-full relative overflow-hidden">
                <AnimatePresence custom={direction} initial={false}>
                  <motion.div
                    key={contentKey}
                    custom={direction}
                    variants={slideH}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={springTrans}
                    className="absolute inset-0 flex flex-row"
                  >
                    {isReel && reel ? (
                      <>
                        {/* Left: 9:16 video panel */}
                        <div className="flex-shrink-0 h-full overflow-hidden overflow-hidden" style={{ width: 304 }}>
                          {!isMobile && <VideoPanel reel={reel} onDoubleTap={handleDoubleTapLike} />}
                        </div>

                        {/* Right: info panel */}
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-l" style={{ borderColor: 'var(--cr-border)' }}>
                          <CreatorRow user={reel.user} following={isFollowing} onToggleFollow={toggleFollow} onClose={onClose} />
                          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                            <ReelBody reel={reel} likeCount={likeCount} commentCount={commentCount} />
                            <div className="mx-4 border-t" style={{ borderColor: 'var(--cr-border)' }} />
                            <div className="px-4 py-3">
                              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--cr-text-1)' }}>Comments</h3>
                              <CommentList comments={comments} loading={cmtLoading} error={cmtError} />
                            </div>
                            <div className="h-3" />
                          </div>
                          {rightPanelFooter}
                        </div>
                      </>
                    ) : recipe ? (
                      <>
                        {/* Left: recipe image */}
                        <div className="flex-shrink-0 h-full overflow-hidden overflow-hidden" style={{ width: 340 }}>
                          <RecipeImagePanel recipe={recipe} idx={index} />
                        </div>

                        {/* Right: info panel */}
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border-l" style={{ borderColor: 'var(--cr-border)' }}>
                          <CreatorRow user={recipe.user} following={isFollowing} onToggleFollow={toggleFollow} onClose={onClose} />
                          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                            <RecipeBody recipe={recipe} />
                            <div className="mx-4 border-t" style={{ borderColor: 'var(--cr-border)' }} />
                            <div className="px-4 py-3">
                              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--cr-text-1)' }}>Comments</h3>
                              <CommentList comments={comments} loading={cmtLoading} error={cmtError} />
                            </div>
                            <div className="h-3" />
                          </div>
                          {rightPanelFooter}
                        </div>
                      </>
                    ) : null}
                  </motion.div>
                </AnimatePresence>

              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {createPortal(modal, document.body)}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={item?.data.title ?? ''}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        currentUserId={currentUserId}
      />
    </>
  )
}
