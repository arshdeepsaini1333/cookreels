'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Heart, MessageCircle, Bookmark, Share2,
  Volume2, VolumeX, BadgeCheck, Play, X, Send,
  ChevronUp, ChevronDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ViewerReel {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  duration: number | null
  likeCount: number
  commentCount: number
  viewCount: number
}

export interface ViewerCreator {
  id: string
  name: string
  username: string
  avatar: string | null
  verified: boolean
  topChef: boolean
}

export interface InstagramReelViewerProps {
  initialReelId: string
  allReels: ViewerReel[]
  creator: ViewerCreator
  currentUserId: string | null
  initialIsFollowing: boolean
  isOwnReel: boolean
  hideLikeCount?: boolean
  blockComments?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const GRADIENTS = [
  'from-orange-600 to-rose-600',   'from-amber-500 to-orange-700',
  'from-pink-400 to-fuchsia-600',  'from-yellow-500 to-amber-600',
  'from-emerald-500 to-teal-700',  'from-red-500 to-orange-600',
  'from-rose-400 to-pink-600',     'from-green-500 to-emerald-600',
  'from-violet-500 to-purple-600', 'from-cyan-500 to-blue-600',
]

// ─── CommentSheet ─────────────────────────────────────────────────────────────

function CommentSheet({ open, onClose, blockComments }: { open: boolean; onClose: () => void; blockComments?: boolean }) {
  const [comment, setComment] = useState('')

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black"
            style={{ zIndex: 60 }}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 flex flex-col rounded-t-3xl overflow-hidden"
            style={{ height: '70vh', zIndex: 70, background: 'var(--cr-bg-card)' }}
          >
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--cr-border)' }} />
            </div>
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b"
              style={{ borderColor: 'var(--cr-border)' }}
            >
              <h3 className="text-base font-bold" style={{ color: 'var(--cr-text-1)' }}>Comments</h3>
              <button onClick={onClose}>
                <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-4">
              <p className="text-center text-sm py-12" style={{ color: 'var(--cr-text-muted)' }}>
                {blockComments ? 'Comments are disabled on this reel.' : 'No comments yet. Be the first!'}
              </p>
            </div>
            {!blockComments && (
              <div
                className="flex-shrink-0 px-4 py-3 border-t"
                style={{
                  borderColor: 'var(--cr-border)',
                  paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                }}
              >
                <div
                  className="flex items-center gap-2.5 rounded-full px-4 py-2.5"
                  style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}
                >
                  <input
                    type="text"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: 'var(--cr-text-1)' }}
                  />
                  <AnimatePresence>
                    {comment.trim() && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.14 }}
                        onClick={() => setComment('')}
                      >
                        <Send className="w-4 h-4" style={{ color: 'var(--cr-accent)' }} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── MobileReelSlot ───────────────────────────────────────────────────────────

interface SlotProps {
  reel: ViewerReel
  index: number
  isActive: boolean
  creator: ViewerCreator
  initialIsFollowing: boolean
  isOwnReel: boolean
  globalMuted: boolean
  onMuteToggle: () => void
  onCommentOpen: () => void
  hideLikeCount?: boolean
}

function MobileReelSlot({
  reel, index, isActive, creator, initialIsFollowing, isOwnReel,
  globalMuted, onMuteToggle, onCommentOpen, hideLikeCount,
}: SlotProps) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const [paused,    setPaused]    = useState(false)
  const [liked,     setLiked]     = useState(false)
  const [likeCount, setLikeCount] = useState(reel.likeCount)
  const [saved,     setSaved]     = useState(false)
  const [following, setFollowing] = useState(initialIsFollowing)
  const [expanded,  setExpanded]  = useState(false)
  const [failed,    setFailed]    = useState(false)
  const gradient = GRADIENTS[index % GRADIENTS.length]

  // Sync muted state with global mute
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = globalMuted
  }, [globalMuted])

  // Play when active, pause when not
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isActive) {
      v.muted = globalMuted
      v.play().catch(() => setPaused(true))
    } else {
      v.pause()
    }
  }, [isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    const v = videoRef.current
    if (!v || failed) return
    if (v.paused) { v.play().catch(() => {}); setPaused(false) }
    else          { v.pause(); setPaused(true) }
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLiked(l => { setLikeCount(c => l ? c - 1 : c + 1); return !l })
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const url = `${window.location.origin}/reel/${reel.id}`
      if (navigator.share) await navigator.share({ title: reel.title, url })
      else await navigator.clipboard.writeText(url)
    } catch {}
  }

  const caption = reel.description || reel.title

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden"
      style={{ width: '100vw', height: '100dvh', scrollSnapAlign: 'start' }}
      onClick={togglePlay}
    >
      {/* Gradient fallback */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

      {!failed && (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          muted
          loop
          playsInline
          autoPlay={isActive}
          poster={reel.thumbnailUrl ?? undefined}
          preload={isActive ? 'auto' : 'metadata'}
          className="absolute inset-0 w-full h-full object-cover"
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onError={() => setFailed(true)}
        />
      )}

      {/* Top gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
      {/* Bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      {/* Paused indicator */}
      <AnimatePresence>
        {paused && !failed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Right action column ── */}
      <div
        className="absolute right-3 flex flex-col items-center gap-5"
        style={{
          bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
          zIndex: 20,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <motion.button whileTap={{ scale: 0.75 }} onClick={handleLike} aria-label="Like">
            <Heart
              className="w-7 h-7"
              style={{
                fill:   liked ? '#F5C518' : 'transparent',
                color:  liked ? '#F5C518' : 'white',
                filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))',
              }}
            />
          </motion.button>
          {!hideLikeCount && (
            <span className="text-white text-xs font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
              {fmt(likeCount)}
            </span>
          )}
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); onCommentOpen() }}
            aria-label="Comments"
          >
            <MessageCircle
              className="w-7 h-7 text-white"
              style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))' }}
            />
          </button>
          <span className="text-white text-xs font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            {fmt(reel.commentCount)}
          </span>
        </div>

        {/* Save */}
        <div className="flex flex-col items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.75 }}
            onClick={e => { e.stopPropagation(); setSaved(s => !s) }}
            aria-label="Save"
          >
            <Bookmark
              className="w-7 h-7"
              style={{
                fill:   saved ? '#F5C518' : 'transparent',
                color:  saved ? '#F5C518' : 'white',
                filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))',
              }}
            />
          </motion.button>
        </div>

        {/* Share */}
        <button onClick={handleShare} aria-label="Share">
          <Share2
            className="w-6 h-6 text-white"
            style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))' }}
          />
        </button>

        {/* Mute */}
        <button
          onClick={e => { e.stopPropagation(); onMuteToggle() }}
          aria-label={globalMuted ? 'Unmute' : 'Mute'}
        >
          {globalMuted
            ? <VolumeX className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))' }} />
            : <Volume2 className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))' }} />
          }
        </button>
      </div>

      {/* ── Bottom info ── */}
      <div
        className="absolute bottom-0 left-0"
        style={{
          right: '64px',
          padding: '0 16px',
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          zIndex: 20,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Creator row */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/40 flex-shrink-0">
            {creator.avatar
              ? <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
              : <div
                  className="w-full h-full flex items-center justify-center font-bold text-sm"
                  style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                >
                  {creator.name.slice(0, 1).toUpperCase()}
                </div>
            }
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-white font-semibold text-sm leading-none truncate"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
            >
              {creator.username}
            </span>
            {creator.verified && (
              <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: '#F5C518' }} />
            )}
            {creator.topChef && (
              <span className="text-xs flex-shrink-0">👑</span>
            )}
          </div>

          {!isOwnReel && (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setFollowing(f => !f)}
              className="ml-auto px-3.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
              style={following
                ? { border: '1.5px solid rgba(255,255,255,0.65)', color: 'white', background: 'transparent' }
                : { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }
              }
            >
              {following ? 'Following' : 'Follow'}
            </motion.button>
          )}
        </div>

        {/* Caption */}
        <p
          className={`text-white text-sm leading-relaxed cursor-pointer ${expanded ? '' : 'line-clamp-2'}`}
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
          onClick={() => setExpanded(e => !e)}
        >
          {caption}
        </p>

        {/* Audio label */}
        <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden">
          <span className="text-white/70 text-xs flex-shrink-0">🎵</span>
          <span className="text-white/70 text-xs truncate">{reel.title}</span>
        </div>
      </div>
    </div>
  )
}

// ─── DesktopReelViewer ────────────────────────────────────────────────────────

interface DesktopProps {
  reel: ViewerReel
  reelIndex: number
  totalReels: number
  creator: ViewerCreator
  initialIsFollowing: boolean
  isOwnReel: boolean
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onBack: () => void
  hideLikeCount?: boolean
  blockComments?: boolean
}

function DesktopReelViewer({
  reel, reelIndex, totalReels, creator, initialIsFollowing, isOwnReel,
  hasPrev, hasNext, onPrev, onNext, onBack, hideLikeCount, blockComments,
}: DesktopProps) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const [muted,     setMuted]     = useState(true)
  const [paused,    setPaused]    = useState(false)
  const [liked,     setLiked]     = useState(false)
  const [likeCount, setLikeCount] = useState(reel.likeCount)
  const [saved,     setSaved]     = useState(false)
  const [following, setFollowing] = useState(initialIsFollowing)
  const [failed,    setFailed]    = useState(false)
  const [comment,   setComment]   = useState('')
  const gradient = GRADIENTS[reelIndex % GRADIENTS.length]

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    setMuted(true)
    setPaused(false)
    setFailed(false)
    setLikeCount(reel.likeCount)
    setLiked(false)
    setSaved(false)
    v.play().catch(() => setPaused(true))
  }, [reel.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    const v = videoRef.current
    if (!v || failed) return
    if (v.paused) { v.play().catch(() => {}); setPaused(false) }
    else          { v.pause(); setPaused(true) }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const handleLike = () => {
    setLiked(l => { setLikeCount(c => l ? c - 1 : c + 1); return !l })
  }

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/reel/${reel.id}`
      if (navigator.share) await navigator.share({ title: reel.title, url })
      else await navigator.clipboard.writeText(url)
    } catch {}
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--cr-bg-main)' }}>

      {/* Back button */}
      <button
        onClick={onBack}
        aria-label="Go back"
        className="fixed top-4 left-4 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)', color: 'var(--cr-text-1)' }}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Prev reel button */}
      {hasPrev && (
        <button
          onClick={onPrev}
          aria-label="Previous reel"
          className="fixed left-4 z-40 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ top: '50%', transform: 'translateY(-50%)', background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)', color: 'var(--cr-text-1)' }}
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={onNext}
          aria-label="Next reel"
          className="fixed right-4 z-40 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ top: '50%', transform: 'translateY(-50%)', background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)', color: 'var(--cr-text-1)' }}
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center p-6 pt-16">
        <div
          className="flex rounded-3xl overflow-hidden w-full"
          style={{
            maxWidth: '880px',
            height: 'min(86vh, 680px)',
            background: 'var(--cr-bg-card)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(245,197,24,0.06)',
          }}
        >
          {/* ── Video panel ── */}
          <div
            className="relative flex-shrink-0 bg-black cursor-pointer"
            style={{ width: '340px' }}
            onClick={togglePlay}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <span className="text-6xl opacity-30">🎬</span>
            </div>

            {!failed && (
              <video
                ref={videoRef}
                key={reel.id}
                src={reel.videoUrl}
                muted
                loop
                playsInline
                autoPlay
                poster={reel.thumbnailUrl ?? undefined}
                className="absolute inset-0 w-full h-full object-cover"
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
                onError={() => setFailed(true)}
              />
            )}

            {/* Gradient overlays */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

            {/* Paused indicator */}
            <AnimatePresence>
              {paused && !failed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top-right: counter + mute */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              {totalReels > 1 && (
                <div className="text-[11px] font-semibold text-white bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                  {reelIndex + 1} / {totalReels}
                </div>
              )}
              <button
                onClick={toggleMute}
                className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
              >
                {muted
                  ? <VolumeX className="w-3.5 h-3.5 text-white" />
                  : <Volume2 className="w-3.5 h-3.5 text-white" />
                }
              </button>
            </div>
          </div>

          {/* ── Details panel ── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">

            {/* Creator header */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b"
              style={{ borderColor: 'var(--cr-border)' }}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 flex-shrink-0"
                   style={{ '--tw-ring-color': 'var(--cr-accent)' } as React.CSSProperties}>
                {creator.avatar
                  ? <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                  : <div
                      className="w-full h-full flex items-center justify-center font-bold text-sm"
                      style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                    >
                      {creator.name.slice(0, 1).toUpperCase()}
                    </div>
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm truncate" style={{ color: 'var(--cr-text-1)' }}>
                    {creator.name}
                  </span>
                  {creator.verified && (
                    <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cr-accent)' }} />
                  )}
                  {creator.topChef && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
                    >
                      👑
                    </span>
                  )}
                </div>
                <span className="text-xs" style={{ color: 'var(--cr-text-muted)' }}>{creator.username}</span>
              </div>

              {!isOwnReel && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFollowing(f => !f)}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0"
                  style={following
                    ? { border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)', background: 'transparent' }
                    : { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }
                  }
                >
                  {following ? 'Following' : 'Follow'}
                </motion.button>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3 min-h-0">
              <h2
                className="font-bold text-base leading-snug"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--cr-text-1)' }}
              >
                {reel.title}
              </h2>

              {reel.description && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--cr-text-2)' }}>
                  {reel.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {!hideLikeCount && (
                  <span
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--cr-bg-surface)', color: 'var(--cr-text-muted)' }}
                  >
                    <Heart className="w-3 h-3" /> {fmt(reel.likeCount)} likes
                  </span>
                )}
                <span
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--cr-bg-surface)', color: 'var(--cr-text-muted)' }}
                >
                  <MessageCircle className="w-3 h-3" /> {fmt(reel.commentCount)} comments
                </span>
              </div>

              <div className="border-t pt-3" style={{ borderColor: 'var(--cr-border)' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--cr-text-1)' }}>Comments</h3>
                {blockComments ? (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--cr-text-muted)' }}>
                    Comments are disabled on this reel.
                  </p>
                ) : (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--cr-text-muted)' }}>
                    No comments yet. Be the first!
                  </p>
                )}
              </div>
            </div>

            {/* Action footer */}
            <div className="flex-shrink-0 border-t" style={{ borderColor: 'var(--cr-border)' }}>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center">
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={handleLike}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full"
                    style={{ color: liked ? '#F5C518' : 'var(--cr-text-muted)' }}
                  >
                    <Heart
                      className="w-5 h-5"
                      style={{ fill: liked ? '#F5C518' : 'transparent', color: liked ? '#F5C518' : 'var(--cr-text-muted)' }}
                    />
                    {!hideLikeCount && (
                      <span className="text-xs font-semibold tabular-nums">{fmt(likeCount)}</span>
                    )}
                  </motion.button>
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full"
                    style={{ color: 'var(--cr-text-muted)' }}
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center">
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    onClick={() => setSaved(s => !s)}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ color: saved ? '#F5C518' : 'var(--cr-text-muted)' }}
                  >
                    <Bookmark
                      className="w-5 h-5"
                      style={{ fill: saved ? '#F5C518' : 'transparent', color: saved ? '#F5C518' : 'var(--cr-text-muted)' }}
                    />
                  </motion.button>
                  <button
                    onClick={handleShare}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ color: 'var(--cr-text-muted)' }}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Comment input */}
              {blockComments ? (
                <p className="text-xs text-center px-4 pb-4" style={{ color: 'var(--cr-text-muted)' }}>
                  Comments are disabled on this reel.
                </p>
              ) : (
                <div className="flex items-center gap-2.5 px-4 pb-4">
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    {creator.avatar
                      ? <img src={creator.avatar} alt="" className="w-full h-full object-cover" />
                      : <div
                          className="w-full h-full"
                          style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)' }}
                        />
                    }
                  </div>
                  <div
                    className="flex-1 flex items-center gap-2 rounded-full px-3.5 py-2"
                    style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}
                  >
                    <input
                      type="text"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) setComment('') }}
                      placeholder="Add a comment…"
                      className="flex-1 bg-transparent text-sm outline-none min-w-0"
                      style={{ color: 'var(--cr-text-1)' }}
                    />
                    <AnimatePresence>
                      {comment.trim() && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ duration: 0.14 }}
                          onClick={() => setComment('')}
                        >
                          <Send className="w-4 h-4" style={{ color: 'var(--cr-accent)' }} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── InstagramReelViewer (main export) ────────────────────────────────────────

export function InstagramReelViewer({
  initialReelId, allReels, creator, currentUserId: _currentUserId,
  initialIsFollowing, isOwnReel, hideLikeCount = false, blockComments = false,
}: InstagramReelViewerProps) {
  const router = useRouter()
  const initialIndex = Math.max(0, allReels.findIndex(r => r.id === initialReelId))

  const [activeIndex,       setActiveIndex]       = useState(initialIndex)
  const [globalMuted,       setGlobalMuted]       = useState(true)
  const [commentSheetOpen,  setCommentSheetOpen]  = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasPrev = activeIndex > 0
  const hasNext = activeIndex < allReels.length - 1

  // Prevent body scroll on mobile
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Set scroll position synchronously in the ref callback — before first paint —
  // so the correct reel is already visible when the browser paints, avoiding any flash.
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node
    if (!node || initialIndex === 0) return
    const slot = node.children[initialIndex] as HTMLElement | undefined
    if (slot) node.scrollTop = slot.offsetTop
  }, [initialIndex])

  // Derive active index from scroll position
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const h = container.clientHeight
    if (h === 0) return
    const newIdx = Math.round(container.scrollTop / h)
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < allReels.length) {
      setActiveIndex(newIdx)
    }
  }, [activeIndex, allReels.length])

  // Programmatic navigation — updates scroll (mobile) or state (desktop)
  const navigateTo = useCallback((index: number) => {
    if (index < 0 || index >= allReels.length) return
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (isMobile) {
      const container = containerRef.current
      if (!container) return
      const slot = container.children[index] as HTMLElement | undefined
      if (slot) container.scrollTo({ top: slot.offsetTop, behavior: 'smooth' })
    } else {
      setActiveIndex(index)
    }
  }, [allReels.length])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (commentSheetOpen) return
      if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  navigateTo(activeIndex - 1)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') navigateTo(activeIndex + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, commentSheetOpen, navigateTo])

  if (allReels.length === 0) return null

  const currentReel = allReels[activeIndex]

  return (
    <>
      {/* ════ MOBILE: full-screen snap scroll ════ */}
      <div
        className="md:hidden fixed inset-0 bg-black"
        style={{ zIndex: 0 }}
      >
        {/* Sticky back button — always above the video */}
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="fixed w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
          style={{
            top:   'calc(16px + env(safe-area-inset-top, 0px))',
            left:  '16px',
            zIndex: 30,
          }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* Vertical snap-scroll container */}
        <div
          ref={setContainerRef}
          onScroll={handleScroll}
          className="h-full w-full scrollbar-none"
          style={{
            overflowY:             'scroll',
            scrollSnapType:        'y mandatory',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior:    'none',
          } as React.CSSProperties}
        >
          {allReels.map((reel, i) => (
            <MobileReelSlot
              key={reel.id}
              reel={reel}
              index={i}
              isActive={i === activeIndex}
              creator={creator}
              initialIsFollowing={initialIsFollowing}
              isOwnReel={isOwnReel}
              globalMuted={globalMuted}
              onMuteToggle={() => setGlobalMuted(m => !m)}
              onCommentOpen={() => setCommentSheetOpen(true)}
              hideLikeCount={hideLikeCount}
            />
          ))}
        </div>

        {/* Comment bottom sheet */}
        <CommentSheet
          open={commentSheetOpen}
          onClose={() => setCommentSheetOpen(false)}
          blockComments={blockComments}
        />
      </div>

      {/* ════ DESKTOP: centered card layout ════ */}
      <div className="hidden md:block">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentReel.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <DesktopReelViewer
              reel={currentReel}
              reelIndex={activeIndex}
              totalReels={allReels.length}
              creator={creator}
              initialIsFollowing={initialIsFollowing}
              isOwnReel={isOwnReel}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrev={() => navigateTo(activeIndex - 1)}
              onNext={() => navigateTo(activeIndex + 1)}
              onBack={() => router.back()}
              hideLikeCount={hideLikeCount}
              blockComments={blockComments}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
