'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Heart, MessageCircle, Bookmark, Share2,
  Volume2, VolumeX, BadgeCheck, Play, X, Send, Flag, MoreHorizontal, Trash2, Loader2,
} from 'lucide-react'
import { ShareModal } from '@/components/shared/ShareModal'
import { GuestBanner } from '@/components/shared/GuestBanner'
import { ReportModal } from '@/components/shared/ReportModal'
import { ProtectedVideo } from '@/components/shared/ProtectedMedia'
import { LoginPromptModal } from '@/components/auth/LoginPromptModal'
import { UserAvatar } from '@/components/shared/UserAvatar'

// Horizontal slide-in/out, direction-aware (mirrors RecipeViewerModal's slideV)
const slideV = {
  enter:  (d: number) => ({ x: d >= 0 ? '100%' : '-100%' }),
  center: { x: 0 },
  exit:   (d: number) => ({ x: d >= 0 ? '-100%' : '100%' }),
}

// Vertical slide-in/out, direction-aware — used on mobile so ctx-mode navigation
// feels like scrolling a reel feed instead of swiping a horizontal carousel.
const slideVVertical = {
  enter:  (d: number) => ({ y: d >= 0 ? '100%' : '-100%' }),
  center: { y: 0 },
  exit:   (d: number) => ({ y: d >= 0 ? '-100%' : '100%' }),
}

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
  currentUserAvatar?: string | null
  currentUserName?: string
  initialIsFollowing: boolean
  isOwnReel: boolean
  hideLikeCount?: boolean
  blockComments?: boolean
  /** Context-aware navigation: navigate outside the creator's reel list */
  ctxPrev?: () => void
  ctxNext?: () => void
  ctxHasPrev?: boolean
  ctxHasNext?: boolean
  /** Called when the viewer should close. Defaults to router.back(). */
  onClose?: () => void
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string
  userId?: string
  username: string
  userAvatar: string | null
  text: string
  createdAt: string
}

// ─── CommentSheetItem ─────────────────────────────────────────────────────────

function CommentSheetItem({ comment: c, currentUserId, reelId, onDelete }: {
  comment: Comment
  currentUserId: string | null
  reelId: string
  onDelete?: (commentId: string) => void
}) {
  const [reportOpen, setReportOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isOwn = !!currentUserId && c.userId === currentUserId

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/reels/${reelId}/comments/${c.id}`, { method: 'DELETE' })
      if (res.ok) onDelete?.(c.id)
    } catch {}
    setDeleting(false)
  }

  return (
    <div className="flex gap-2.5 group">
      <UserAvatar
        src={c.userAvatar}
        name={c.username}
        size="w-8 h-8 text-xs"
        style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold" style={{ color: 'var(--cr-text-1)' }}>@{c.username}</span>
        <p className="text-sm mt-0.5 leading-snug" style={{ color: 'var(--cr-text-2)' }}>{c.text}</p>
      </div>
      {currentUserId && (
        <>
          {isOwn ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="self-start mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete comment"
              style={{ color: '#EF4444' }}
            >
              {deleting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />
              }
            </button>
          ) : (
            <>
              <button
                onClick={() => setReportOpen(true)}
                className="self-start mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Report comment"
                style={{ color: 'var(--cr-text-muted)' }}
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
              <ReportModal
                isOpen={reportOpen}
                onClose={() => setReportOpen(false)}
                targetType="REEL_COMMENT"
                targetId={c.id}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── CommentSheet ─────────────────────────────────────────────────────────────

function CommentSheet({
  open, onClose, blockComments, reelId, currentUserId, currentUserAvatar, currentUserName,
}: {
  open: boolean
  onClose: () => void
  blockComments?: boolean
  reelId: string
  currentUserId: string | null
  currentUserAvatar?: string | null
  currentUserName?: string
}) {
  const [comments,   setComments]   = useState<Comment[]>([])
  const [loading,    setLoading]    = useState(false)
  const [comment,    setComment]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || blockComments) return
    setLoading(true)
    fetch(`/api/reels/${reelId}/comments`)
      .then(r => r.json())
      .then(data => setComments(data.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, reelId, blockComments])

  const submitComment = async () => {
    if (!comment.trim() || submitting || !currentUserId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reels/${reelId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
        setComment('')
        setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
        }, 50)
      }
    } catch {}
    setSubmitting(false)
  }

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
              <h3 className="text-base font-bold" style={{ color: 'var(--cr-text-1)' }}>
                Comments {comments.length > 0 && <span style={{ color: 'var(--cr-text-muted)', fontWeight: 400 }}>({comments.length})</span>}
              </h3>
              <button onClick={onClose}>
                <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-none px-5 py-4 space-y-4">
              {blockComments ? (
                <p className="text-center text-sm py-12" style={{ color: 'var(--cr-text-muted)' }}>
                  Comments are disabled on this reel.
                </p>
              ) : loading ? (
                <div className="space-y-3 pt-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-2.5 animate-pulse">
                      <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'var(--cr-border)' }} />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 rounded-full w-1/3" style={{ background: 'var(--cr-border)' }} />
                        <div className="h-2 rounded-full w-2/3" style={{ background: 'var(--cr-border)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm py-12" style={{ color: 'var(--cr-text-muted)' }}>
                  No comments yet. Be the first!
                </p>
              ) : (
                comments.map(c => (
                  <CommentSheetItem
                    key={c.id}
                    comment={c}
                    currentUserId={currentUserId}
                    reelId={reelId}
                    onDelete={id => setComments(prev => prev.filter(x => x.id !== id))}
                  />
                ))
              )}
            </div>

            {!blockComments && (
              <div
                className="flex-shrink-0 px-4 py-3 border-t"
                style={{
                  borderColor: 'var(--cr-border)',
                  paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
                }}
              >
                {!currentUserId ? (
                  <p className="text-center text-xs py-1" style={{ color: 'var(--cr-text-muted)' }}>
                    Sign in to comment
                  </p>
                ) : (
                  <div className="flex items-center gap-2.5">
                  <UserAvatar src={currentUserAvatar} name={currentUserName} size="w-7 h-7 text-[10px]" />
                  <div
                    className="flex-1 flex items-center gap-2.5 rounded-full px-4 py-2.5"
                    style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}
                  >
                    <input
                      type="text"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
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
                          onClick={submitComment}
                          disabled={submitting}
                        >
                          <Send className="w-4 h-4" style={{ color: 'var(--cr-accent)', opacity: submitting ? 0.5 : 1 }} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                  </div>
                )}
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
  currentUserId: string | null
  onReportedReel?: () => void
}

function MobileReelSlot({
  reel, index, isActive, creator, initialIsFollowing, isOwnReel,
  globalMuted, onMuteToggle, onCommentOpen, hideLikeCount, currentUserId,
  onReportedReel,
}: SlotProps) {
  const router      = useRouter()
  const videoRef    = useRef<HTMLVideoElement>(null)
  const [paused,    setPaused]    = useState(false)
  const [liked,     setLiked]     = useState(false)
  const [likeCount, setLikeCount] = useState(reel.likeCount)
  const [saved,     setSaved]     = useState(false)
  const [following, setFollowing] = useState(initialIsFollowing)
  const [expanded,  setExpanded]  = useState(false)
  const [failed,    setFailed]    = useState(false)
  const [videoLoading, setVideoLoading] = useState(true)
  const [posterOk,  setPosterOk]  = useState(true)
  const [shareOpen,  setShareOpen]  = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const gradient = GRADIENTS[index % GRADIENTS.length]

  // Preload the thumbnail so a broken URL never reaches the <video poster>
  // (a failed poster load otherwise renders the browser's broken-image icon).
  useEffect(() => {
    if (!reel.thumbnailUrl) { setPosterOk(false); return }
    setPosterOk(true)
    const img = new window.Image()
    img.onload = () => setPosterOk(true)
    img.onerror = () => setPosterOk(false)
    img.src = reel.thumbnailUrl
  }, [reel.thumbnailUrl])

  // Fetch initial like and save state from the server
  useEffect(() => {
    fetch(`/api/reels/${reel.id}/likes`)
      .then(r => r.json())
      .then(d => { setLiked(d.liked ?? false); setLikeCount(d.likeCount ?? reel.likeCount) })
      .catch(() => {})
  }, [reel.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentUserId) return
    fetch(`/api/reels/${reel.id}/save`)
      .then(r => r.json())
      .then(d => setSaved(d.saved ?? false))
      .catch(() => {})
  }, [reel.id, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync muted state with global mute
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = globalMuted
  }, [globalMuted])

  // Play when active, pause when not
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // Only play on mobile — DesktopReelViewer handles audio on wider screens.
    // Both layouts are always in the DOM (CSS md:hidden doesn't stop playback).
    if (isActive && window.innerWidth < 768) {
      v.muted = true // start muted so autoplay is never blocked
      v.play()
        .then(() => { v.muted = globalMuted })
        .catch(() => setPaused(true))
    } else {
      v.pause()
    }
  }, [isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pause on unmount so audio stops the instant this slot leaves the DOM.
  useEffect(() => {
    return () => { videoRef.current?.pause() }
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v || failed) return
    if (v.paused) { v.play().catch(() => {}); setPaused(false) }
    else          { v.pause(); setPaused(true) }
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1))
    try {
      await fetch(`/api/reels/${reel.id}/like`, { method: newLiked ? 'POST' : 'DELETE' })
    } catch {
      setLiked(!newLiked)
      setLikeCount(c => newLiked ? Math.max(0, c - 1) : c + 1)
    }
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) return
    const newSaved = !saved
    setSaved(newSaved)
    try {
      await fetch(`/api/reels/${reel.id}/save`, { method: newSaved ? 'POST' : 'DELETE' })
    } catch {
      setSaved(!newSaved)
    }
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShareOpen(true)
  }

  const caption = reel.description || reel.title

  return (
    <>
    <div
      className="relative flex-shrink-0 overflow-hidden"
      style={{ width: '100vw', height: '100dvh', scrollSnapAlign: 'start' }}
      onClick={togglePlay}
    >
      {/* Gradient fallback */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

      {!failed && (
        <ProtectedVideo
          ref={videoRef}
          src={reel.videoUrl}
          loop
          playsInline
          poster={posterOk ? reel.thumbnailUrl ?? undefined : undefined}
          preload={isActive ? 'auto' : 'metadata'}
          className="absolute inset-0 w-full h-full object-cover"
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onLoadedData={() => setVideoLoading(false)}
          onPlaying={() => setVideoLoading(false)}
          onWaiting={() => setVideoLoading(true)}
          onError={() => setFailed(true)}
        />
      )}

      {/* Loading spinner — shown instead of a broken-image icon while the video/poster loads */}
      {!failed && videoLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
          <Loader2 className="w-8 h-8 text-white animate-spin" style={{ opacity: 0.85 }} />
        </div>
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
            onClick={handleSave}
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

        {/* Report */}
        {currentUserId && !isOwnReel && (
          <button onClick={e => { e.stopPropagation(); setReportOpen(true) }} aria-label="Report reel">
            <Flag
              className="w-5 h-5 text-white/70"
              style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))' }}
            />
          </button>
        )}

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
          <div
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            onClick={e => { e.stopPropagation(); router.push(`/user/${creator.username.replace(/^@/, '')}`) }}
          >
            <UserAvatar src={creator.avatar} name={creator.name} size="w-10 h-10 text-sm ring-2 ring-white/40" />

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
          </div>

          {!isOwnReel && (
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => { currentUserId ? setFollowing(f => !f) : setLoginPromptOpen(true) }}
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
    <ShareModal
      isOpen={shareOpen}
      onClose={() => setShareOpen(false)}
      title={reel.title}
      url={`${typeof window !== 'undefined' ? window.location.origin : ''}/reel/${reel.id}`}
      currentUserId={currentUserId ?? undefined}
      contentType="reel"
      contentId={reel.id}
    />
    <ReportModal
      isOpen={reportOpen}
      onClose={() => setReportOpen(false)}
      targetType="REEL"
      targetId={reel.id}
      onReported={onReportedReel}
    />
    <LoginPromptModal
      isOpen={loginPromptOpen}
      onClose={() => setLoginPromptOpen(false)}
      redirectTo={`/reel/${reel.id}`}
      title="Login to follow"
      message={`Sign in to follow ${creator.username} and see more from them.`}
    />
    </>
  )
}

// ─── DesktopCommentItem ───────────────────────────────────────────────────────

function DesktopCommentItem({ comment: c, currentUserId, reelId, onDelete }: {
  comment: Comment
  currentUserId: string | null
  reelId: string
  onDelete?: (commentId: string) => void
}) {
  const [reportOpen, setReportOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isOwn = !!currentUserId && c.userId === currentUserId

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/reels/${reelId}/comments/${c.id}`, { method: 'DELETE' })
      if (res.ok) onDelete?.(c.id)
    } catch {}
    setDeleting(false)
  }

  return (
    <div className="flex gap-2 group">
      <UserAvatar
        src={c.userAvatar}
        name={c.username}
        size="w-7 h-7 text-[10px]"
        style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold" style={{ color: 'var(--cr-text-1)' }}>@{c.username}</span>
        <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--cr-text-2)' }}>{c.text}</p>
      </div>
      {currentUserId && (
        <>
          {isOwn ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="self-start mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete comment"
              style={{ color: '#EF4444' }}
            >
              {deleting
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Trash2 className="w-3 h-3" />
              }
            </button>
          ) : (
            <>
              <button
                onClick={() => setReportOpen(true)}
                className="self-start mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Report comment"
                style={{ color: 'var(--cr-text-muted)' }}
              >
                <Flag className="w-3 h-3" />
              </button>
              <ReportModal
                isOpen={reportOpen}
                onClose={() => setReportOpen(false)}
                targetType="REEL_COMMENT"
                targetId={c.id}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── DesktopReelViewer ────────────────────────────────────────────────────────

interface DesktopProps {
  reel: ViewerReel
  reelIndex: number
  totalReels: number
  creator: ViewerCreator
  currentUserAvatar?: string | null
  currentUserName?: string
  initialIsFollowing: boolean
  isOwnReel: boolean
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onBack: () => void
  showBanner?: boolean
  hideLikeCount?: boolean
  blockComments?: boolean
  currentUserId: string | null
  onReportedReel?: () => void
}

function DesktopReelViewer({
  reel, reelIndex, totalReels, creator, currentUserAvatar, currentUserName,
  initialIsFollowing, isOwnReel,
  hasPrev, hasNext, onPrev, onNext, onBack, hideLikeCount, blockComments, currentUserId, showBanner,
  onReportedReel,
}: DesktopProps) {
  const router      = useRouter()
  const videoRef    = useRef<HTMLVideoElement>(null)
  const listRef     = useRef<HTMLDivElement>(null)
  const [muted,      setMuted]      = useState(false)
  const [paused,     setPaused]     = useState(false)
  const [liked,      setLiked]      = useState(false)
  const [likeCount,  setLikeCount]  = useState(reel.likeCount)
  const [saved,      setSaved]      = useState(false)
  const [following,  setFollowing]  = useState(initialIsFollowing)
  const [failed,     setFailed]     = useState(false)
  const [videoLoading, setVideoLoading] = useState(true)
  const [posterOk,   setPosterOk]   = useState(true)
  const [comment,    setComment]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [comments,   setComments]   = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [shareOpen,  setShareOpen]  = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const gradient = GRADIENTS[reelIndex % GRADIENTS.length]

  // Preload the thumbnail so a broken URL never reaches the <video poster>
  // (a failed poster load otherwise renders the browser's broken-image icon).
  useEffect(() => {
    if (!reel.thumbnailUrl) { setPosterOk(false); return }
    setPosterOk(true)
    const img = new window.Image()
    img.onload = () => setPosterOk(true)
    img.onerror = () => setPosterOk(false)
    img.src = reel.thumbnailUrl
  }, [reel.thumbnailUrl])

  // Fetch initial like/save state and comments when reel changes
  useEffect(() => {
    fetch(`/api/reels/${reel.id}/likes`)
      .then(r => r.json())
      .then(d => { setLiked(d.liked ?? false); setLikeCount(d.likeCount ?? reel.likeCount) })
      .catch(() => {})

    if (currentUserId) {
      fetch(`/api/reels/${reel.id}/save`)
        .then(r => r.json())
        .then(d => setSaved(d.saved ?? false))
        .catch(() => {})
    }

    if (!blockComments) {
      setCommentsLoading(true)
      fetch(`/api/reels/${reel.id}/comments`)
        .then(r => r.json())
        .then(d => setComments(d.comments ?? []))
        .catch(() => {})
        .finally(() => setCommentsLoading(false))
    }
  }, [reel.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    // Only play on desktop — MobileReelSlot handles audio on narrower screens.
    // Both layouts are always in the DOM (CSS hidden md:block doesn't stop playback).
    if (window.innerWidth < 768) return
    v.muted = muted
    setPaused(false)
    setFailed(false)
    setVideoLoading(true)
    setLikeCount(reel.likeCount)
    setLiked(false)
    setSaved(false)
    v.play().catch(() => {
      // Browser blocked unmuted autoplay — retry muted
      v.muted = true
      setMuted(true)
      v.play().catch(() => setPaused(true))
    })
  }, [reel.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pause immediately on unmount so audio stops before AnimatePresence exit
  // animation completes — prevents the previous reel's audio from leaking.
  useEffect(() => {
    return () => { videoRef.current?.pause() }
  }, [])

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

  const handleLike = async () => {
    if (!currentUserId) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikeCount(c => newLiked ? c + 1 : Math.max(0, c - 1))
    try {
      await fetch(`/api/reels/${reel.id}/like`, { method: newLiked ? 'POST' : 'DELETE' })
    } catch {
      setLiked(!newLiked)
      setLikeCount(c => newLiked ? Math.max(0, c - 1) : c + 1)
    }
  }

  const handleSave = async () => {
    if (!currentUserId) return
    const newSaved = !saved
    setSaved(newSaved)
    try {
      await fetch(`/api/reels/${reel.id}/save`, { method: newSaved ? 'POST' : 'DELETE' })
    } catch {
      setSaved(!newSaved)
    }
  }

  const submitComment = async () => {
    if (!comment.trim() || submitting || !currentUserId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reels/${reel.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
        setComment('')
        setTimeout(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
        }, 50)
      }
    } catch {}
    setSubmitting(false)
  }

  const handleShare = () => setShareOpen(true)

  return (
    <>
      {/* Prev / Next — recipe-modal style, outside the card */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          aria-label="Previous reel"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm
                     flex items-center justify-center hover:bg-white/30 transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          aria-label="Next reel"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm
                     flex items-center justify-center hover:bg-white/30 transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Centered card — click outside to close */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4 lg:p-6"
        style={showBanner ? { top: 'calc(60px + env(safe-area-inset-top, 0px))' } : undefined}
        onClick={onBack}
      >
        <div
          className="flex rounded-3xl overflow-hidden w-full"
          style={{
            maxWidth: '880px',
            height: 'min(86dvh, 680px)',
            background: 'var(--cr-bg-card)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(245,197,24,0.06)',
          }}
          onClick={e => e.stopPropagation()}
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
              <ProtectedVideo
                ref={videoRef}
                key={reel.id}
                src={reel.videoUrl}
                loop
                playsInline
                poster={posterOk ? reel.thumbnailUrl ?? undefined : undefined}
                className="absolute inset-0 w-full h-full object-cover"
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
                onLoadedData={() => setVideoLoading(false)}
                onPlaying={() => setVideoLoading(false)}
                onWaiting={() => setVideoLoading(true)}
                onError={() => setFailed(true)}
              />
            )}

            {/* Loading spinner — shown instead of a broken-image icon while the video/poster loads */}
            {!failed && videoLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
                <Loader2 className="w-8 h-8 text-white animate-spin" style={{ opacity: 0.85 }} />
              </div>
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
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => router.push(`/user/${creator.username.replace(/^@/, '')}`)}
              >
                <UserAvatar
                  src={creator.avatar}
                  name={creator.name}
                  size="w-10 h-10 text-sm ring-2"
                  style={{ '--tw-ring-color': 'var(--cr-accent)' } as React.CSSProperties}
                />

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
              </div>

              {!isOwnReel && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { currentUserId ? setFollowing(f => !f) : setLoginPromptOpen(true) }}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0"
                  style={following
                    ? { border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)', background: 'transparent' }
                    : { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }
                  }
                >
                  {following ? 'Following' : 'Follow'}
                </motion.button>
              )}

              {/* X close button — same as recipe modal */}
              <button
                onClick={onBack}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
              </button>
            </div>

            {/* Scrollable content */}
            <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3 min-h-0">
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
                    <Heart className="w-3 h-3" /> {fmt(likeCount)} likes
                  </span>
                )}
                <span
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--cr-bg-surface)', color: 'var(--cr-text-muted)' }}
                >
                  <MessageCircle className="w-3 h-3" /> {fmt(comments.length || reel.commentCount)} comments
                </span>
              </div>

              <div className="border-t pt-3" style={{ borderColor: 'var(--cr-border)' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--cr-text-1)' }}>Comments</h3>
                {blockComments ? (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--cr-text-muted)' }}>
                    Comments are disabled on this reel.
                  </p>
                ) : commentsLoading ? (
                  <div className="space-y-3">
                    {[1,2].map(i => (
                      <div key={i} className="flex gap-2 animate-pulse">
                        <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: 'var(--cr-border)' }} />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2 rounded-full w-1/3" style={{ background: 'var(--cr-border)' }} />
                          <div className="h-2 rounded-full w-2/3" style={{ background: 'var(--cr-border)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--cr-text-muted)' }}>
                    No comments yet. Be the first!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map(c => (
                      <DesktopCommentItem
                        key={c.id}
                        comment={c}
                        currentUserId={currentUserId}
                        reelId={reel.id}
                        onDelete={id => setComments(prev => prev.filter(x => x.id !== id))}
                      />
                    ))}
                  </div>
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
                    disabled={!currentUserId}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full"
                    style={{ color: liked ? '#F5C518' : 'var(--cr-text-muted)', opacity: !currentUserId ? 0.5 : 1 }}
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
                    onClick={() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs font-semibold tabular-nums">{fmt(comments.length || reel.commentCount)}</span>
                  </button>
                </div>
                <div className="flex items-center">
                  <motion.button
                    whileTap={{ scale: 0.82 }}
                    onClick={handleSave}
                    disabled={!currentUserId}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ color: saved ? '#F5C518' : 'var(--cr-text-muted)', opacity: !currentUserId ? 0.5 : 1 }}
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
                  {currentUserId && !isOwnReel && (
                    <button
                      onClick={() => setReportOpen(true)}
                      aria-label="Report reel"
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-70"
                      style={{ color: 'var(--cr-text-muted)' }}
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Comment input */}
              {blockComments ? (
                <p className="text-xs text-center px-4 pb-4" style={{ color: 'var(--cr-text-muted)' }}>
                  Comments are disabled on this reel.
                </p>
              ) : !currentUserId ? (
                <p className="text-xs text-center px-4 pb-4" style={{ color: 'var(--cr-text-muted)' }}>
                  Sign in to comment
                </p>
              ) : (
                <div className="flex items-center gap-2.5 px-4 pb-4">
                  <UserAvatar src={currentUserAvatar} name={currentUserName} size="w-7 h-7 text-[10px]" />
                  <div
                    className="flex-1 flex items-center gap-2 rounded-full px-3.5 py-2"
                    style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}
                  >
                    <input
                      type="text"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
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
                          onClick={submitComment}
                          disabled={submitting}
                        >
                          <Send className="w-4 h-4" style={{ color: 'var(--cr-accent)', opacity: submitting ? 0.5 : 1 }} />
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
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={reel.title}
        url={`${typeof window !== 'undefined' ? window.location.origin : ''}/reel/${reel.id}`}
        currentUserId={currentUserId ?? undefined}
        contentType="reel"
        contentId={reel.id}
      />
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="REEL"
        targetId={reel.id}
        onReported={onReportedReel}
      />
      <LoginPromptModal
        isOpen={loginPromptOpen}
        onClose={() => setLoginPromptOpen(false)}
        redirectTo={`/reel/${reel.id}`}
        title="Login to follow"
        message={`Sign in to follow ${creator.username} and see more from them.`}
      />
    </>
  )
}

// ─── InstagramReelViewer (main export) ────────────────────────────────────────

export function InstagramReelViewer({
  initialReelId, allReels, creator, currentUserId,
  currentUserAvatar, currentUserName,
  initialIsFollowing, isOwnReel, hideLikeCount = false, blockComments = false,
  ctxPrev, ctxNext, ctxHasPrev, ctxHasNext, onClose,
}: InstagramReelViewerProps) {
  const router = useRouter()
  const handleClose = onClose ?? (() => router.back())
  const initialIndex = Math.max(0, allReels.findIndex(r => r.id === initialReelId))

  const [activeIndex,       setActiveIndex]       = useState(initialIndex)
  const [globalMuted,       setGlobalMuted]       = useState(false)
  const [commentSheetOpen,  setCommentSheetOpen]  = useState(false)
  const [direction,         setDirection]         = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const mobileSwipeX = useRef<number | null>(null)
  const mobileSwipeY = useRef<number | null>(null)

  const inCtxMode = ctxPrev !== undefined || ctxNext !== undefined
  const hasPrev = inCtxMode ? !!ctxHasPrev : activeIndex > 0
  const hasNext = inCtxMode ? !!ctxHasNext : activeIndex < allReels.length - 1

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

  // Direction-aware navigation — sets slide direction, then delegates to ctx or local nav.
  const goPrev = useCallback(() => {
    setDirection(-1)
    if (inCtxMode) ctxPrev?.()
    else navigateTo(activeIndex - 1)
  }, [inCtxMode, ctxPrev, navigateTo, activeIndex])

  const goNext = useCallback(() => {
    setDirection(1)
    if (inCtxMode) ctxNext?.()
    else navigateTo(activeIndex + 1)
  }, [inCtxMode, ctxNext, navigateTo, activeIndex])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (commentSheetOpen) return
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commentSheetOpen, goPrev, goNext])

  if (allReels.length === 0) return null

  const currentReel = allReels[activeIndex]

  const showBanner = !currentUserId

  return (
    <>
      {/* Guest banner for unauthenticated viewers */}
      {showBanner && <GuestBanner />}

      {/* ════ MOBILE: full-screen snap scroll ════ */}
      <div
        className="md:hidden fixed inset-0 bg-black"
        style={{ zIndex: 0 }}
      >
        {/* Sticky back button — always above the video */}
        <button
          onClick={handleClose}
          aria-label="Go back"
          className="fixed w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
          style={{
            top:   showBanner ? 'calc(60px + env(safe-area-inset-top, 0px))' : 'calc(16px + env(safe-area-inset-top, 0px))',
            left:  '16px',
            zIndex: 30,
          }}
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* Vertical snap-scroll container (non-ctx) / horizontal slide container (ctx) */}
        <div
          ref={setContainerRef}
          onScroll={inCtxMode ? undefined : handleScroll}
          className={inCtxMode ? 'h-full w-full relative overflow-hidden' : 'h-full w-full scrollbar-none'}
          style={inCtxMode ? undefined : {
            overflowY:             'scroll',
            scrollSnapType:        'y mandatory',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior:    'none',
          } as React.CSSProperties}
          onTouchStart={inCtxMode ? (e) => {
            mobileSwipeX.current = e.touches[0].clientX
            mobileSwipeY.current = e.touches[0].clientY
          } : undefined}
          onTouchEnd={inCtxMode ? (e) => {
            if (mobileSwipeY.current === null) return
            // Vertical swipe: up → next reel, down → previous (mirrors a reel feed's scroll direction).
            const dy = mobileSwipeY.current - e.changedTouches[0].clientY
            const dx = Math.abs((mobileSwipeX.current ?? 0) - e.changedTouches[0].clientX)
            if (Math.abs(dy) > 60 && Math.abs(dy) > dx) {
              if (dy > 0) goNext()
              else goPrev()
            }
            mobileSwipeX.current = mobileSwipeY.current = null
          } : undefined}
        >
          {inCtxMode ? (
            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={currentReel.id}
                custom={direction}
                variants={slideVVertical}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 360, damping: 36 }}
                className="absolute inset-0"
              >
                <MobileReelSlot
                  reel={currentReel}
                  index={activeIndex}
                  isActive={true}
                  creator={creator}
                  initialIsFollowing={initialIsFollowing}
                  isOwnReel={isOwnReel}
                  globalMuted={globalMuted}
                  onMuteToggle={() => setGlobalMuted(m => !m)}
                  onCommentOpen={() => setCommentSheetOpen(true)}
                  hideLikeCount={hideLikeCount}
                  currentUserId={currentUserId}
                  onReportedReel={goNext}
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            // Virtualised: only the active slot and its immediate neighbours get a real
            // <video> element. Mounting every reel unconditionally (as this used to)
            // fired off a network request per reel — up to 60 concurrent video loads —
            // which starved the active video's connection and made it slow or never play.
            allReels.map((reel, i) => (
              Math.abs(i - activeIndex) <= 1 ? (
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
                  currentUserId={currentUserId}
                  onReportedReel={goNext}
                />
              ) : (
                <div
                  key={reel.id}
                  className="flex-shrink-0 bg-black"
                  style={{ width: '100vw', height: '100dvh', scrollSnapAlign: 'start' }}
                />
              )
            ))
          )}
        </div>

        {/* Comment bottom sheet */}
        <CommentSheet
          open={commentSheetOpen}
          onClose={() => setCommentSheetOpen(false)}
          blockComments={blockComments}
          reelId={currentReel.id}
          currentUserId={currentUserId}
          currentUserAvatar={currentUserAvatar}
          currentUserName={currentUserName}
        />
      </div>

      {/* ════ DESKTOP: centered card layout ════ */}
      <div className="hidden md:block md:h-full relative overflow-hidden">
        <AnimatePresence custom={direction} initial={false}>
          <motion.div
            key={currentReel.id}
            custom={direction}
            variants={slideV}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="absolute inset-0"
          >
            <DesktopReelViewer
              reel={currentReel}
              reelIndex={activeIndex}
              totalReels={allReels.length}
              creator={creator}
              currentUserAvatar={currentUserAvatar}
              currentUserName={currentUserName}
              initialIsFollowing={initialIsFollowing}
              isOwnReel={isOwnReel}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPrev={goPrev}
              onNext={goNext}
              onBack={handleClose}
              hideLikeCount={hideLikeCount}
              blockComments={blockComments}
              currentUserId={currentUserId}
              showBanner={showBanner}
              onReportedReel={goNext}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}
