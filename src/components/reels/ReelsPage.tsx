'use client'

import {
  useState, useRef, useEffect, useCallback, memo,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Bookmark, Share2,
  X, ChevronUp, ChevronDown, Send, Loader2,
  Check, Sparkles, Flame,
  Home, Compass, Film, LayoutGrid, User,
  Users, UserCheck, UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { useReelLikes } from '@/hooks/useReelLikes'
import { useReelSave } from '@/hooks/useReelSave'
import { useReelComments } from '@/hooks/useReelComments'
import type { ReelCommentItem } from '@/hooks/useReelComments'
import type { FeedReel } from '@/lib/reelsFeed'
import { ShareModal } from '@/components/shared/ShareModal'

export type { FeedReel }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

function fmtDate(iso: string) {
  try {
    const d    = new Date(iso)
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1)  return 'just now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  } catch { return '' }
}

const AVATAR_GRADIENTS = [
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-green-400 to-emerald-500',
  'from-blue-400 to-indigo-500',
  'from-purple-400 to-violet-500',
  'from-teal-400 to-cyan-500',
  'from-red-400 to-rose-500',
  'from-cyan-400 to-sky-500',
]

function avatarGradient(username: string): string {
  let h = 0
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

// ─── Feed Hook ────────────────────────────────────────────────────────────────
//
// All client-side fetches use cursor-based pagination so the database never
// needs to scan rows it already returned (no OFFSET at depth).
//
// The list is allowed to grow unboundedly in JS state, but because we only
// render 3 real React subtrees at a time (virtualised), memory pressure
// stays flat even after hours of scrolling.

function useReelsFeed(
  initialReels: FeedReel[],
  initialHasMore = true,
  initialCursor: string | null = null,
) {
  const [reels, setReels]     = useState<FeedReel[]>(initialReels)
  const [cursor, setCursor]   = useState<string | null>(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)

  const loadingRef = useRef(false)
  const loopingRef = useRef(false)
  // Full deduplicated set — used to loop the feed once the server is exhausted.
  const baseReels  = useRef<FeedReel[]>(initialReels)
  const seenIds    = useRef(new Set<string>(initialReels.map(r => r.id)))

  // Fetch page 1 only when SSR provided no data (edge case: redirect without data).
  useEffect(() => {
    if (initialReels.length > 0) return
    const ctrl = new AbortController()
    fetch('/api/reels/feed?limit=5', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        const fresh = (d.reels as FeedReel[]).filter(r => !seenIds.current.has(r.id))
        fresh.forEach(r => seenIds.current.add(r.id))
        baseReels.current = fresh
        setReels(fresh)
        setHasMore(d.hasMore)
        setCursor(d.nextCursor ?? null)
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loopingRef.current) return

    if (hasMore) {
      loadingRef.current = true
      setLoading(true)
      try {
        // cursor='' signals "start from beginning"; a real cursor resumes the feed.
        const url = cursor
          ? `/api/reels/feed?cursor=${encodeURIComponent(cursor)}&limit=5`
          : '/api/reels/feed?cursor=&limit=5'
        const res = await fetch(url)
        if (!res.ok) return
        const d = await res.json()

        const fresh = (d.reels as FeedReel[]).filter(r => !seenIds.current.has(r.id))
        fresh.forEach(r => seenIds.current.add(r.id))

        setReels(prev => {
          const next = [...prev, ...fresh]
          if (!d.hasMore) baseReels.current = next // full set known — use for looping
          return next
        })
        setHasMore(d.hasMore)
        setCursor(d.nextCursor ?? null)
      } catch (err) {
        console.error('[useReelsFeed]', err)
      } finally {
        loadingRef.current = false
        setLoading(false)
      }
    } else {
      // All server reels exhausted — loop back through the full deduplicated set.
      loopingRef.current = true
      setReels(prev => [...prev, ...baseReels.current])
      setTimeout(() => { loopingRef.current = false }, 400)
    }
  }, [cursor, hasMore])

  return { reels, loading, hasMore, loadMore }
}

// ─── Mobile Bottom Navbar ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  { icon: Home,       label: 'Home',       href: '/' },
  { icon: Compass,    label: 'Explore',    href: '/explore' },
  { icon: Film,       label: 'Reels',      href: '/reels' },
  { icon: LayoutGrid, label: 'Categories', href: '/categories' },
  { icon: User,       label: 'Profile',    href: '/profile' },
]

const MOBILE_NAV_H = 64
const HEADER_H     = 64

function MobileBottomNavbar() {
  const pathname = usePathname()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className="flex items-center justify-around w-full"
      style={{
        height: MOBILE_NAV_H,
        background: isDark ? '#1E1E1F' : '#F7F1D9',
        borderTop: `1px solid ${isDark ? '#343438' : '#E0D9C8'}`,
      }}
    >
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={label}
            href={href}
            className="relative flex flex-col items-center justify-center gap-1 flex-1 h-full py-2 rounded-2xl"
          >
            {isActive && (
              <motion.div
                layoutId="mob-reel-pill"
                className="absolute inset-0 rounded-2xl"
                style={{ background: 'rgba(245,197,24,0.12)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <motion.span
              animate={{ scale: isActive ? 1.08 : 1, y: isActive ? -1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative"
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.7}
                style={{ color: isActive ? '#F5C518' : isDark ? '#71717A' : '#9CA3AF' }}
              />
            </motion.span>
            <span
              className="relative text-[10px] font-semibold leading-none transition-colors"
              style={{ color: isActive ? '#F5C518' : isDark ? '#71717A' : '#9CA3AF' }}
            >
              {label}
            </span>
            {isActive && (
              <motion.div
                layoutId="mob-reel-dot"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#F5C518]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        )
      })}
    </div>
  )
}

// ─── Relation Badge ───────────────────────────────────────────────────────────

const RELATION_CONFIG: Record<FeedReel['relationTag'], {
  bg: string; border: string; text: string; label: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
}> = {
  friend:      { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.28)',  text: '#6ee7b7', label: 'by your friend',      Icon: Users },
  following:   { bg: 'rgba(14,165,233,0.15)',  border: 'rgba(14,165,233,0.28)',  text: '#7dd3fc', label: 'by following',        Icon: UserCheck },
  follower:    { bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.28)',  text: '#c4b5fd', label: 'by follower',         Icon: UserPlus },
  recommended: { bg: 'rgba(245,197,24,0.15)',  border: 'rgba(245,197,24,0.28)',  text: '#F5C518', label: 'your recommendation', Icon: Sparkles },
}

function RelationBadge({ tag }: { tag: FeedReel['relationTag'] }) {
  const { bg, border, text, label, Icon } = RELATION_CONFIG[tag]
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl shadow-lg"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <Icon size={11} style={{ color: text }} />
      <span className="text-[10px] font-bold tracking-wide" style={{ color: text }}>{label}</span>
    </div>
  )
}

// ─── Glass Action Button ──────────────────────────────────────────────────────

function GlassBtn({
  label, children, count, active = false, activeClass = '', onClick,
}: {
  label: string
  children: React.ReactNode
  count?: string
  active?: boolean
  activeClass?: string
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <motion.button
      aria-label={label}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.80 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5"
    >
      <div
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[18px] flex items-center justify-center border shadow-2xl transition-all duration-200 ${
          active
            ? `${activeClass} bg-white/18 border-white/20 backdrop-blur-2xl`
            : 'bg-black/45 border-white/10 backdrop-blur-2xl text-white hover:bg-white/18 hover:border-white/25'
        }`}
      >
        {children}
      </div>
      {count !== undefined && (
        <span className="text-white/90 text-[11px] font-bold drop-shadow-md leading-none">{count}</span>
      )}
    </motion.button>
  )
}

// ─── Comment Avatar ───────────────────────────────────────────────────────────

function CommentAvatar({ src, username }: { src: string | null; username: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={username}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        loading="lazy"
      />
    )
  }
  return (
    <div
      className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(username)} flex-shrink-0 flex items-center justify-center text-white text-xs font-bold`}
    >
      {username[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ─── Comment Drawer ───────────────────────────────────────────────────────────

function CommentDrawer({
  open, onClose, reelId,
}: {
  open: boolean
  onClose: () => void
  reelId?: string
}) {
  const [text, setText]           = useState('')
  const [isDesktop, setIsDesktop] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    comments, commentCount, loading,
    submitting, error, addComment,
  } = useReelComments(reelId ?? '', open && !!reelId)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    const ok = await addComment(trimmed)
    if (ok) setText('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/65 backdrop-blur-[2px]"
          />
          <motion.div
            initial={isDesktop ? { x: '100%' } : { y: '100%' }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`absolute z-50 flex flex-col overflow-hidden ${
              isDesktop
                ? 'right-0 top-0 bottom-0 w-96 border-l'
                : 'bottom-0 left-0 right-0 rounded-t-3xl border-t'
            }`}
            style={{
              background: '#1E1E1F',
              borderColor: '#343438',
              maxHeight: !isDesktop ? '88vh' : undefined,
            }}
          >
            {!isDesktop && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[#343438]" />
              </div>
            )}

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#343438' }}>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-white tracking-tight">Comments</span>
                {commentCount > 0 && (
                  <span className="text-[12px] text-[#71717A]">({fmt(commentCount)})</span>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: '#2B2B2D' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#343438' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#2B2B2D' }}
              >
                <X size={14} className="text-[#A1A1AA]" />
              </motion.button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="space-y-5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-[#343438] flex-shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-2.5 rounded-full w-1/3 bg-[#343438]" />
                        <div className="h-2.5 rounded-full w-4/5 bg-[#343438]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <p className="text-[13px] text-[#52525B] text-center py-6">{error}</p>
              ) : comments.length === 0 ? (
                <p className="text-[13px] text-[#52525B] text-center py-8">
                  No comments yet. Be the first! 👋
                </p>
              ) : (
                <div className="space-y-5">
                  <AnimatePresence initial={false}>
                    {comments.map((c: ReelCommentItem) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-3"
                      >
                        <CommentAvatar src={c.userAvatar} username={c.username} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[13px] font-semibold text-white">{c.username}</span>
                            <span className="text-[11px] text-[#52525B]">{fmtDate(c.createdAt)}</span>
                          </div>
                          <p className="text-[13px] mt-0.5 leading-relaxed text-[#A1A1AA]">{c.text}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t" style={{ background: '#1E1E1F', borderColor: '#343438' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #F5C518 0%, #FFB800 100%)' }}
                >
                  <span className="text-[11px] font-bold text-[#1A1A1A]">U</span>
                </div>
                <div
                  className="flex-1 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 border"
                  style={{ background: '#2B2B2D', borderColor: '#343438' }}
                >
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Add a comment…"
                    aria-label="Add a comment"
                    disabled={submitting}
                    className="flex-1 bg-transparent text-[13px] text-white outline-none"
                    style={{ caretColor: '#F5C518' }}
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSubmit}
                  disabled={submitting || !text.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                  style={{
                    background: text.trim() ? '#F5C518' : '#2B2B2D',
                    color:      text.trim() ? '#1A1A1A' : '#52525B',
                    boxShadow:  text.trim() ? '0 4px 16px rgba(245,197,24,0.30)' : 'none',
                  }}
                >
                  {submitting
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Send size={14} />
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Reel Card ────────────────────────────────────────────────────────────────
//
// Performance notes:
//   • memo() prevents re-renders when sibling reels change.
//   • Video preload tiers: active="auto", next="metadata", others="none".
//     "metadata" lets the browser fetch just enough to display a poster/duration
//     without buffering the full stream, enabling smooth transitions.
//   • The cleanup effect pauses and clears src on unmount so the browser
//     immediately stops any in-flight buffer requests for off-screen videos.
//   • currentTime is only reset when the card *becomes* active, not on every
//     isActive change, to avoid stuttering during rapid scrolls.

const ReelCard = memo(function ReelCard({
  reel, isActive, isNext = false, onComment, currentUserId,
}: {
  reel: FeedReel
  isActive: boolean
  isNext?: boolean
  onComment: () => void
  currentUserId?: string
}) {
  const [heartPos, setHeartPos]       = useState({ x: 0, y: 0 })
  const [showHeart, setShowHeart]     = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [shareOpen, setShareOpen]     = useState(false)
  const videoRef      = useRef<HTMLVideoElement>(null)
  const wasActiveRef  = useRef(false)
  const tapRef        = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null })

  const { liked, likeCount, toggle: toggleLike } = useReelLikes(
    reel.id, reel.likes, isActive, reel.liked,
  )
  const { saved, toggle: toggleSave } = useReelSave(reel.id, isActive)

  // Play / pause based on visibility.
  // Reset to start only on first activation, not on every focus change.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isActive) {
      if (!wasActiveRef.current) {
        v.currentTime = 0
        wasActiveRef.current = true
      }
      v.play().catch(() => setVideoFailed(true))
    } else {
      wasActiveRef.current = false
      v.pause()
    }
  }, [isActive])

  // Release browser resources when the card is removed from the DOM.
  useEffect(() => {
    return () => {
      const v = videoRef.current
      if (!v) return
      v.pause()
      v.src = ''
      v.load() // triggers abort of any pending network requests
    }
  }, [])

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return
    const t = tapRef.current
    t.count += 1
    if (t.count >= 2) {
      if (t.timer) clearTimeout(t.timer)
      t.count = 0
      const rect = e.currentTarget.getBoundingClientRect()
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setShowHeart(true)
      if (!liked) toggleLike()
      setTimeout(() => setShowHeart(false), 900)
    } else {
      t.timer = setTimeout(() => { t.count = 0 }, 280)
    }
  }, [liked, toggleLike])

  const initial = reel.creator.username[0]?.toUpperCase() ?? '?'

  // Derive preload tier once per render — avoids inline ternary chains
  const videoPreload = isActive ? 'auto' : isNext ? 'metadata' : 'none'

  return (
    <div
      className="relative w-full h-full flex-shrink-0 snap-start overflow-hidden select-none"
      onClick={handleTap}
    >
      {/* Dark base — always visible, hides any flash before media loads */}
      <div className="absolute inset-0 bg-[#0d0d0d]" />

      {/* Thumbnail — loads instantly, covers gap while the video buffers */}
      {reel.thumbnailUrl && (
        <img
          src={reel.thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading={isActive || isNext ? 'eager' : 'lazy'}
        />
      )}

      {/* Video — only load source for current and next reel */}
      {!videoFailed && (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          muted
          loop
          playsInline
          autoPlay={isActive}
          preload={videoPreload}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setVideoFailed(true)}
        />
      )}

      {/* Emoji fallback — only when video failed AND no thumbnail */}
      {videoFailed && !reel.thumbnailUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d]">
          <span className="text-[72px] opacity-40">{reel.emoji}</span>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/96 via-black/8 to-black/32 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/22 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#F5C518]/25 to-transparent pointer-events-none" />

      {/* Double-tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0.3, opacity: 1 }}
            animate={{ scale: 2.0, opacity: 0 }}
            transition={{ duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute pointer-events-none z-30"
            style={{ left: heartPos.x - 45, top: heartPos.y - 45 }}
          >
            <Heart size={90} className="fill-red-500 text-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Relation + trending badges */}
      <div className="absolute top-12 sm:top-14 left-4 z-20 flex flex-col gap-2">
        <RelationBadge tag={reel.relationTag} />
        {reel.isTrending && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl shadow-lg"
            style={{ background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.28)' }}
          >
            <Flame size={11} style={{ color: '#F5C518' }} />
            <span className="text-[10px] font-bold tracking-wide" style={{ color: '#F5C518' }}>Trending</span>
          </div>
        )}
      </div>

      {/* Right action buttons */}
      <div
        className="absolute right-3 bottom-28 sm:bottom-24 z-20 flex flex-col items-center gap-3 sm:gap-4"
        onClick={e => e.stopPropagation()}
      >
        <GlassBtn
          label={liked ? 'Unlike' : 'Like'}
          count={fmt(likeCount)}
          active={liked}
          activeClass="text-red-500"
          onClick={toggleLike}
        >
          <motion.div animate={{ scale: liked ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.25 }}>
            <Heart size={20} strokeWidth={liked ? 0 : 1.8} className={liked ? 'fill-red-500 text-red-500' : ''} />
          </motion.div>
        </GlassBtn>

        <GlassBtn label="Comment" count={fmt(reel.comments)} onClick={onComment}>
          <MessageCircle size={20} strokeWidth={1.8} />
        </GlassBtn>

        <GlassBtn label="Save" count={fmt(reel.saves + (saved ? 1 : 0))} active={saved} onClick={toggleSave}>
          <Bookmark
            size={20}
            strokeWidth={saved ? 0 : 1.8}
            style={{ color: saved ? '#F5C518' : undefined }}
            fill={saved ? '#F5C518' : 'none'}
          />
        </GlassBtn>

        <GlassBtn label="Share" count="Share" onClick={() => setShareOpen(true)}>
          <Share2 size={18} strokeWidth={1.8} />
        </GlassBtn>
      </div>

      {/* Bottom-left: creator + title + expandable details */}
      <div
        className="absolute bottom-0 left-0 right-[64px] z-20 px-3 pb-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1.5">
          {reel.creator.profileImage && !/googleusercontent\.com/i.test(reel.creator.profileImage) ? (
            <img
              src={reel.creator.profileImage}
              alt={reel.creator.username}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-white/20 shadow-lg"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(reel.creator.username)} flex-shrink-0 flex items-center justify-center ring-2 ring-white/20 shadow-lg`}>
              <span className="text-white text-[11px] font-bold">{initial}</span>
            </div>
          )}
          <span className="text-[13px] font-bold text-white">@{reel.creator.username}</span>
          {reel.creator.isVerified && (
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F5C518' }}>
              <Check size={8} strokeWidth={3} className="text-[#1A1A1A]" />
            </div>
          )}
        </div>

        <div>
          <span
            className="text-[15px] font-bold text-white drop-shadow-md leading-snug"
            style={{ fontFamily: 'var(--font-playfair), serif' }}
          >
            {reel.recipeTitle}
          </span>
        </div>

        <AnimatePresence>
          {detailsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="overflow-hidden"
            >
              {reel.caption && (
                <p className="text-[12px] text-white/70 leading-relaxed mt-2">{reel.caption}</p>
              )}
              {reel.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {reel.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] text-white/40 font-medium">{tag}</span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-1.5">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setDetailsOpen(o => !o)}
            className="text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors"
          >
            {detailsOpen ? 'less ↑' : 'more ↓'}
          </motion.button>
        </div>
      </div>

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={reel.recipeTitle}
        url={`${typeof window !== 'undefined' ? window.location.origin : ''}/reel/${reel.id}`}
        currentUserId={currentUserId}
      />
    </div>
  )
})

// ─── Main Export 

export function ReelsPage({
  initialReels   = [],
  initialHasMore = true,
  initialCursor  = null,
  currentUserId,
}: {
  initialReels?:  FeedReel[]
  initialHasMore?: boolean
  initialCursor?:  string | null
  currentUserId?: string
}) {
  const [activeIdx, setActiveIdx]     = useState(0)
  const [commentOpen, setCommentOpen] = useState(false)
  const mobileContainerRef  = useRef<HTMLDivElement>(null)
  const desktopContainerRef = useRef<HTMLDivElement>(null)

  // IntersectionObserver instances — created once, never recreated.
  const mobileIoRef   = useRef<IntersectionObserver | null>(null)
  const desktopIoRef  = useRef<IntersectionObserver | null>(null)
  // Track how many children are already observed so we only observe new ones.
  const mobileObsCnt  = useRef(0)
  const desktopObsCnt = useRef(0)

  const { reels, loading, hasMore, loadMore } = useReelsFeed(
    initialReels, initialHasMore, initialCursor,
  )

  const activeReel  = reels[activeIdx]
  const openComments = useCallback(() => setCommentOpen(true), [])

  // Suppress DashboardLayout's main scroll on mobile
  useEffect(() => {
    const main = document.querySelector('main') as HTMLElement | null
    if (!main) return
    const orig = main.style.overflow
    main.style.overflow = 'hidden'
    return () => { main.style.overflow = orig }
  }, [])

  // ── IntersectionObserver (mobile) ────────────────────────────────────────────
  //
  // Created once on mount.  When new reels load we extend observation to the
  // newly added children — no full teardown / recreate on every page load.
  // Each item div carries data-reel-index so the callback knows the position.

  useEffect(() => {
    const el = mobileContainerRef.current
    if (!el) return
    mobileIoRef.current = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const i = parseInt((entry.target as HTMLElement).dataset.reelIndex ?? '-1')
            if (i !== -1) setActiveIdx(i)
          }
        }
      },
      { root: el, threshold: 0.65 },
    )
    return () => {
      mobileIoRef.current?.disconnect()
      mobileIoRef.current = null
      mobileObsCnt.current = 0
    }
  }, [])

  // ── IntersectionObserver (desktop) ───────────────────────────────────────────

  useEffect(() => {
    const el = desktopContainerRef.current
    if (!el) return
    desktopIoRef.current = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const i = parseInt((entry.target as HTMLElement).dataset.reelIndex ?? '-1')
            if (i !== -1) setActiveIdx(i)
          }
        }
      },
      { root: el, threshold: 0.65 },
    )
    return () => {
      desktopIoRef.current?.disconnect()
      desktopIoRef.current = null
      desktopObsCnt.current = 0
    }
  }, [])

  // Extend observation when new children are added (runs after reels.length changes).
  // Only count children that carry data-reel-index — this excludes the loading
  // spinner div, which would otherwise inflate the count and cause the observer
  // to skip the first reel of every newly loaded page.
  useEffect(() => {
    const mob = mobileContainerRef.current
    const mio = mobileIoRef.current
    if (mob && mio) {
      const kids = Array.from(mob.children).filter(
        k => (k as HTMLElement).dataset.reelIndex !== undefined,
      ) as HTMLElement[]
      kids.slice(mobileObsCnt.current).forEach(k => mio.observe(k))
      mobileObsCnt.current = kids.length
    }

    const dsk = desktopContainerRef.current
    const dio = desktopIoRef.current
    if (dsk && dio) {
      const kids = Array.from(dsk.children).filter(
        k => (k as HTMLElement).dataset.reelIndex !== undefined,
      ) as HTMLElement[]
      kids.slice(desktopObsCnt.current).forEach(k => dio.observe(k))
      desktopObsCnt.current = kids.length
    }
  }, [reels.length])

  // Load more when approaching the end (3 items buffer gives time to fetch).
  useEffect(() => {
    if (reels.length > 0 && activeIdx >= reels.length - 3) {
      loadMore()
    }
  }, [activeIdx, reels.length, loadMore])

  // Keep the URL in sync with the active reel so individual reels can be
  // shared, bookmarked, and deep-linked via /reels?reelId=<id>.
  // replaceState is intentional — scroll navigation should not pollute history.
  useEffect(() => {
    const reel = reels[activeIdx]
    if (!reel) return
    window.history.replaceState(null, '', `/reels?reelId=${reel.id}`)
  }, [activeIdx, reels])

  const scrollDesktop = (dir: -1 | 1) =>
    desktopContainerRef.current?.scrollBy({
      top: dir * (desktopContainerRef.current.clientHeight ?? 0),
      behavior: 'smooth',
    })

  const glowColor = activeReel?.glow ?? '#F5C518'

  // ── Virtualised render helpers ────────────────────────────────────────────────
  //
  // Only the active reel and its immediate neighbours (±1) are rendered as full
  // React subtrees.  All other positions get an empty <div> that preserves the
  // snap-scroll height and provides a stable IntersectionObserver target, but
  // has zero DOM weight (no video elements, no event listeners, no animations).
  //
  // This caps active React component instances at 3 regardless of list size,
  // preventing memory growth and eliminating layout/paint work for off-screen
  // items.

  const renderMobileReel = (reel: FeedReel, i: number) => {
    const inWindow = Math.abs(i - activeIdx) <= 1
    return (
      <div
        key={i}
        data-reel-index={i}
        className="h-full w-full flex-shrink-0 snap-start"
      >
        {inWindow && (
          <ReelCard
            reel={reel}
            isActive={i === activeIdx}
            isNext={i === activeIdx + 1}
            onComment={openComments}
            currentUserId={currentUserId}
          />
        )}
      </div>
    )
  }

  const renderDesktopReel = (reel: FeedReel, i: number) => {
    const inWindow = Math.abs(i - activeIdx) <= 1
    return (
      <div
        key={i}
        data-reel-index={i}
        className="w-full h-full flex-shrink-0 snap-start"
      >
        {inWindow && (
          <ReelCard
            reel={reel}
            isActive={i === activeIdx}
            isNext={i === activeIdx + 1}
            onComment={openComments}
            currentUserId={currentUserId}
          />
        )}
      </div>
    )
  }

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          MOBILE — full-viewport immersive overlay (hidden md+)
      ══════════════════════════════════════════════════════════ */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-[100] bg-black overflow-hidden"
        style={{ top: HEADER_H }}
      >
        <div className="absolute inset-x-0 top-0" style={{ bottom: MOBILE_NAV_H }}>
          {reels.length === 0 ? (
            <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#120200,#220800,#0a0100)' }}>
              <div className="absolute inset-0 animate-pulse" style={{ background: 'radial-gradient(ellipse 60% 50% at 40% 45%, rgba(245,197,24,0.06) 0%, transparent 70%)' }} />
            </div>
          ) : (
            <div
              ref={mobileContainerRef}
              className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              {reels.map(renderMobileReel)}
              {loading && (
                <div className="h-20 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-[#F5C518]/30 border-t-[#F5C518] animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {!commentOpen && (
            <motion.div
              key="mob-nav"
              initial={{ y: MOBILE_NAV_H }}
              animate={{ y: 0 }}
              exit={{ y: MOBILE_NAV_H }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 z-50"
            >
              <MobileBottomNavbar />
            </motion.div>
          )}
        </AnimatePresence>

        <CommentDrawer
          open={commentOpen}
          onClose={() => setCommentOpen(false)}
          reelId={activeReel?.id}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP — phone-frame layout (hidden below md)
      ══════════════════════════════════════════════════════════ */}
      <div
        className="hidden md:flex relative -mx-4 sm:-mx-6 -mt-6 -mb-4 overflow-hidden items-stretch justify-center"
        style={{ height: 'calc(100svh - 4rem)', minHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 65% 75% at 50% 45%, ${glowColor}22 0%, transparent 70%)` }}
        />

        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Nav arrows */}
        <div className="flex flex-col items-center justify-center gap-4 w-20 flex-shrink-0 z-20">
          {([{ dir: -1 as const, Icon: ChevronUp }, { dir: 1 as const, Icon: ChevronDown }]).map(({ dir, Icon }) => (
            <motion.button
              key={dir}
              whileHover={{ scale: 1.1, y: dir === -1 ? -2 : 2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scrollDesktop(dir)}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all backdrop-blur-sm"
              style={{ background: 'rgba(43,43,45,0.70)', border: '1px solid #343438', color: '#A1A1AA' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'rgba(245,197,24,0.40)'
                el.style.color = '#F5C518'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = '#343438'
                el.style.color = '#A1A1AA'
              }}
            >
              <Icon size={19} />
            </motion.button>
          ))}
        </div>

        {/* Phone-frame */}
        <div className="relative h-full flex items-center w-full md:w-auto flex-shrink-0 md:py-[3px]">
          {reels.length === 0 ? (
            <div
              className="w-full md:w-[340px] h-full md:h-auto md:aspect-[9/16] md:max-h-full overflow-hidden"
              style={{ borderRadius: 28, background: 'linear-gradient(135deg,#120200,#220800,#0a0100)' }}
            />
          ) : (
            <div
              ref={desktopContainerRef}
              className="overflow-y-scroll snap-y snap-mandatory scrollbar-none md:rounded-[28px] w-full md:w-[340px] h-full md:h-auto md:aspect-[9/16] md:max-h-full"
              style={{
                scrollbarWidth: 'none',
                boxShadow: '0 0 0 1px rgba(52,52,56,0.80), 0 0 80px rgba(0,0,0,0.70)',
              }}
            >
              {reels.map(renderDesktopReel)}
              {loading && (
                <div className="h-24 flex items-center justify-center bg-black">
                  <div className="w-5 h-5 rounded-full border-2 border-[#F5C518]/30 border-t-[#F5C518] animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-20 flex-shrink-0" />

        <CommentDrawer
          open={commentOpen}
          onClose={() => setCommentOpen(false)}
          reelId={activeReel?.id}
        />
      </div>
    </>
  )
}
