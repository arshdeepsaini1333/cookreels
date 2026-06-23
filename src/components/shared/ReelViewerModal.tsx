'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Heart, MessageCircle, Share2, Bookmark, BadgeCheck,
  Send, Play, Volume2, VolumeX,
} from 'lucide-react'
import type { ProfileReel, ProfileUser } from '@/components/profile/ProfilePage'
import { useReelLikes } from '@/hooks/useReelLikes'
import { useReelComments } from '@/hooks/useReelComments'
import { ShareModal } from '@/components/shared/ShareModal'

// ─── Props (unchanged — callers pass the same shape) ──────────────────────────

export interface ReelViewerModalProps {
  reels: ProfileReel[]
  initialIndex: number
  user: ProfileUser
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


// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, size = 'md' }: { src?: string | null; name: string; size?: 'sm' | 'md' }) {
  const initials = (name ?? '').split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?'
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  return (
    <div className={`${dim} rounded-full overflow-hidden flex-shrink-0`}>
      {src && !/googleusercontent\.com/i.test(src)
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold"
               style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}>
            {initials}
          </div>
      }
    </div>
  )
}

// ─── 16:9 Video player ───────────────────────────────────────────────────────

function VideoPlayer({ reel }: { reel: ProfileReel }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted,  setMuted]  = useState(true)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState(false)

  // Auto-play when the reel changes (key-based remount in parent handles cleanup)
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    setMuted(true)
    setPaused(false)
    setFailed(false)
    v.play().catch(() => setPaused(true))
  }, [reel.id])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}); setPaused(false) }
    else          { v.pause();                 setPaused(true)  }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  return (
    <div
      className="relative w-full bg-black overflow-hidden cursor-pointer"
      style={{ aspectRatio: '16/9' }}
      onClick={togglePlay}
    >
      {!failed && (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          poster={reel.thumbnailUrl ?? undefined}
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-contain"
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onError={() => setFailed(true)}
        />
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl opacity-50">🎬</span>
        </div>
      )}

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
            <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-7 h-7 text-white fill-white ml-0.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute toggle */}
      {!failed && (
        <button
          onClick={toggleMute}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center z-10"
        >
          {muted
            ? <VolumeX className="w-3.5 h-3.5 text-white" />
            : <Volume2 className="w-3.5 h-3.5 text-white" />
          }
        </button>
      )}
    </div>
  )
}

// ─── Comment skeleton ─────────────────────────────────────────────────────────

function CommentSkeleton() {
  return (
    <div className="space-y-3">
      {[60, 80, 50].map((w, i) => (
        <div key={i} className="flex gap-2 animate-pulse">
          <div className="w-7 h-7 rounded-full shrink-0" style={{ background: 'var(--cr-border)' }} />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-2.5 rounded" style={{ width: `${w}px`, background: 'var(--cr-border)' }} />
            <div className="h-2 rounded w-full" style={{ background: 'var(--cr-border)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── UserInfo (avatar + name chip, shared by both headers) ───────────────────

function UserInfo({ user, onNavigate }: { user: ProfileUser; onNavigate: () => void }) {
  return (
    <button onClick={onNavigate} className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition-opacity">
      <div
        className="ring-2 ring-offset-2 rounded-full flex-shrink-0"
        style={{ '--tw-ring-color': 'var(--cr-accent)', '--tw-ring-offset-color': 'var(--cr-bg-card)' } as React.CSSProperties}
      >
        <Avatar src={user.avatar} name={user.name} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--cr-text-1)' }}>
            {user.name}
          </span>
          {user.verified && (
            <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--cr-accent)' }} />
          )}
          {user.topChef && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}>
              👑
            </span>
          )}
        </div>
        <span className="text-[11px]" style={{ color: 'var(--cr-text-muted)' }}>
          {user.username}
        </span>
      </div>
    </button>
  )
}

// ─── ReelViewerModal ──────────────────────────────────────────────────────────

export function ReelViewerModal({
  reels, initialIndex, user, isOpen, onClose,
  currentUserAvatar, currentUserName, currentUserId,
}: ReelViewerModalProps) {
  const router = useRouter()

  function goToProfile() {
    onClose()
    router.push(`/user/${user.username}`)
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [me, setMe] = useState<{ firstName: string; lastName: string; profileImage: string | null } | null>(null)
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.firstName) setMe(d) })
      .catch(() => {})
  }, [])

  const [index]     = useState(initialIndex)
  const [saved,      setSaved]      = useState(false)
  const [following,  setFollowing]  = useState(false)
  const [commentText, setCommentText] = useState('')
  const [shareOpen,  setShareOpen]  = useState(false)

  const reel   = reels[index]
  const active = isOpen && !!reel?.id

  const { likeCount, liked, toggle: toggleLike } = useReelLikes(
    reel?.id ?? '', reel?.likeCount ?? 0, active
  )
  const { comments, loading: commentsLoading, addComment, submitting } = useReelComments(
    reel?.id ?? '', active
  )

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [isOpen, onClose])

  // Reset comment input when reel changes
  useEffect(() => { setCommentText('') }, [reel?.id])

  const handleSubmit = useCallback(async () => {
    if (!commentText.trim() || submitting) return
    const ok = await addComment(commentText)
    if (ok) setCommentText('')
  }, [commentText, submitting, addComment])

  if (!reel || !mounted) return null

  const resolvedAvatar = currentUserAvatar ?? me?.profileImage ?? null
  const resolvedName   = currentUserName   ?? (me ? `${me.firstName} ${me.lastName}` : user.name)
  const commenter = resolvedName

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="rvr-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-xl"
            style={{ zIndex: 9998 }}
          />

          {/* Shell */}
          <motion.div
            key="rvr-shell"
            initial={{ opacity: 0, scale: 0.94, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.91, y: 20 }}
            transition={{ type: 'spring', stiffness: 310, damping: 30 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-4 md:p-6"
            style={{ zIndex: 9999 }}
            role="dialog"
            aria-modal="true"
            aria-label={reel.title}
          >
            {/*
              Mobile  → flex-col  : header / video (16:9) / scrollable content / input
              Desktop → flex-row  : video fills left | right panel has header + content + input
            */}
            <div
              onClick={e => e.stopPropagation()}
              className="
                relative w-full overflow-hidden
                flex flex-col
                rounded-t-3xl max-h-[96dvh]
                sm:rounded-3xl sm:max-w-xl sm:max-h-[90vh]
                md:max-w-5xl md:max-h-none md:h-[540px] md:flex-row md:rounded-3xl
              "
              style={{ background: 'var(--cr-bg-card)' }}
            >

              {/* ══ MOBILE HEADER (hidden on desktop) ══ */}
              <div
                className="md:hidden flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
                style={{ borderColor: 'var(--cr-border)' }}
              >
                <UserInfo user={user} onNavigate={goToProfile} />
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
                </button>
              </div>

              {/* ══ VIDEO ══
                  Mobile : aspect-video (16:9), full width, no flex growth
                  Desktop: flex-1, fills fixed-height row (aspect-ratio overridden by flex)
              */}
              <div className="relative w-full aspect-video flex-shrink-0 md:flex-1 md:aspect-auto md:h-full bg-black overflow-hidden">
                <VideoPlayer key={reel.id} reel={reel} />
              </div>

              {/* ══ RIGHT PANEL (desktop) / BOTTOM PANEL (mobile) ══ */}
              <div
                className="
                  flex flex-col overflow-hidden min-h-0
                  flex-1
                  md:flex-none md:w-80 md:h-full md:border-l
                " 
                style={{ borderColor: 'var(--cr-border)' }}
              >

                {/* ── Desktop header (hidden on mobile) ── */}
                <div
                  className="hidden md:flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b"
                  style={{ borderColor: 'var(--cr-border)' }}
                >
                  <button onClick={goToProfile} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                    <Avatar src={user.avatar} name={user.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--cr-text-1)' }}>
                          {user.name}
                        </span>
                        {user.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--cr-accent)' }} />}
                      </div>
                      <span className="text-[11px]" style={{ color: 'var(--cr-text-muted)' }}>{user.username}</span>
                    </div>
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFollowing(f => !f)}
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
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 flex-shrink-0"
                  >
                    <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
                  </button>
                </div>

                {/* ── Scrollable body: title + stats + comments ── */}
                <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">

                  {/* Title + stat pills */}
                  <div className="px-4 pt-4 pb-3 space-y-2">
                    <h2
                      className="font-bold text-base leading-snug"
                      style={{ fontFamily: 'var(--font-heading)', color: 'var(--cr-text-1)' }}
                    >
                      {reel.title}
                    </h2>
                    {reel.description && (
                      <p className="text-sm leading-snug" style={{ color: 'var(--cr-text-2)' }}>
                        {reel.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {/* ♡ likes pill */}
                      <span
                        className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border"
                        style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-muted)' }}
                      >
                        <Heart className="w-3 h-3" />
                        {fmt(likeCount)} likes
                      </span>
                      {/* ○ comments pill */}
                      <span
                        className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border"
                        style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-muted)' }}
                      >
                        <MessageCircle className="w-3 h-3" />
                        {comments.length} comments
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="mx-4 border-t" style={{ borderColor: 'var(--cr-border)' }} />

                  {/* Comments */}
                  <div className="px-4 py-3">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--cr-text-1)' }}>
                      Comments
                    </h3>
                    {commentsLoading ? (
                      <CommentSkeleton />
                    ) : comments.length === 0 ? (
                      <p className="text-xs py-5 text-center" style={{ color: 'var(--cr-text-muted)' }}>
                        No comments yet. Be the first!
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {comments.map(c => (
                          <div key={c.id} className="flex gap-2.5">
                            <Avatar src={c.userAvatar} name={c.username} size="sm" />
                            <div className="min-w-0">
                              <span className="text-[11px] font-semibold" style={{ color: 'var(--cr-text-1)' }}>
                                @{c.username}
                              </span>
                              <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--cr-text-2)' }}>
                                {c.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-3" />
                </div>

                {/* ── Pinned bottom bar: actions ── */}
                <div
                  className="flex-shrink-0 border-t"
                  style={{ borderColor: 'var(--cr-border)' }}
                >
                  {/* Action row */}
                  <div className="flex items-center px-3 py-2">
                    <motion.button
                      whileTap={{ scale: 0.82 }}
                      onClick={toggleLike}
                      className="flex items-center gap-1.5 px-2 py-2 rounded-full transition-colors"
                      style={{ color: liked ? '#F5C518' : 'var(--cr-text-muted)' }}
                      aria-label={liked ? 'Unlike' : 'Like'}
                    >
                      <motion.span animate={{ scale: liked ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.22 }}>
                        <Heart
                          className="w-5 h-5"
                          style={{ fill: liked ? '#F5C518' : 'transparent', color: liked ? '#F5C518' : 'var(--cr-text-muted)' }}
                        />
                      </motion.span>
                      <span className="text-xs font-semibold tabular-nums">{fmt(likeCount)}</span>
                    </motion.button>

                    <button
                      className="p-2 rounded-full"
                      style={{ color: 'var(--cr-text-muted)' }}
                      aria-label="Comments"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>

                    <div className="flex-1" />

                    <motion.button
                      whileTap={{ scale: 0.82 }}
                      onClick={() => setSaved(s => !s)}
                      className="p-2 rounded-full"
                      style={{ color: saved ? '#F5C518' : 'var(--cr-text-muted)' }}
                      aria-label={saved ? 'Unsave' : 'Save'}
                    >
                      <Bookmark
                        className="w-5 h-5"
                        style={{ fill: saved ? '#F5C518' : 'transparent', color: saved ? '#F5C518' : 'var(--cr-text-muted)' }}
                      />
                    </motion.button>

                    <button
                      onClick={() => setShareOpen(true)}
                      className="p-2 rounded-full hover:opacity-70"
                      style={{ color: 'var(--cr-text-muted)' }}
                      aria-label="Share"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Comment input row */}
                  <div className="flex items-center gap-2.5 px-4 pb-4">
                    <Avatar src={resolvedAvatar} name={commenter} size="sm" />
                    <div
                      className="flex-1 flex items-center gap-2 rounded-full px-3.5 py-2"
                      style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}
                    >
                      <input
                        type="text"
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                        placeholder="Add a comment…"
                        aria-label="Add a comment"
                        className="flex-1 bg-transparent text-sm outline-none min-w-0"
                        style={{ color: 'var(--cr-text-1)' }}
                      />
                      <AnimatePresence>
                        {commentText.trim() && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.14 }}
                            onClick={handleSubmit}
                            disabled={submitting}
                            aria-label="Post comment"
                            className="flex-shrink-0"
                          >
                            <Send className="w-4 h-4" style={{ color: 'var(--cr-accent)' }} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

              </div>{/* end right panel */}
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
        title={reel?.title ?? ''}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        currentUserId={currentUserId}
      />
    </>
  )
}
