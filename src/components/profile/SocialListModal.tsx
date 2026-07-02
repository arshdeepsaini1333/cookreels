'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Search, UserPlus, UserCheck, Users, BadgeCheck, Loader2,
} from 'lucide-react'
import type { SocialUser, PaginatedUsers } from '@/types/social'
import { UserAvatar as SharedUserAvatar } from '@/components/shared/UserAvatar'

export type SocialListType = 'followers' | 'following' | 'friends'

export interface SocialListModalProps {
  isOpen:        boolean
  onClose:       () => void
  title:         string
  username:      string
  listType:      SocialListType
  currentUserId?: string | null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserAvatar({ user }: { user: SocialUser }) {
  return (
    <SharedUserAvatar
      src={user.profileImage}
      name={`${user.firstName} ${user.lastName}`}
      size="lg"
    />
  )
}

interface FollowBtnProps {
  user:       SocialUser
  isPending:  boolean
  onToggle:   () => void
}

function FollowBtn({ user, isPending, onToggle }: FollowBtnProps) {
  const handleClick = (e: React.MouseEvent) => { e.stopPropagation(); onToggle() }

  if (isPending) {
    return (
      <button
        disabled
        onClick={e => e.stopPropagation()}
        className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700/70 flex items-center justify-center shrink-0"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
      </button>
    )
  }

  if (user.isFriend) {
    return (
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#F5C518] to-[#FFD84D] text-[#1A1A1A] flex items-center gap-1 shrink-0"
      >
        <Users className="w-3 h-3" /> Friends
      </motion.button>
    )
  }

  if (user.isFollowing) {
    return (
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5C518]/15 border border-[#F5C518]/50 text-[#B38B00] dark:text-[#f6c68b] flex items-center gap-1 shrink-0"
      >
        <UserCheck className="w-3 h-3" /> Following
      </motion.button>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#F5C518] to-[#FFD84D] text-[#1A1A1A] flex items-center gap-1 shrink-0"
    >
      <UserPlus className="w-3 h-3" /> Follow
    </motion.button>
  )
}

interface UserRowProps {
  user:          SocialUser
  onNavigate:    () => void
  onToggle:      () => void
  isPending:     boolean
  isCurrentUser: boolean
}

function UserRow({ user, onNavigate, onToggle, isPending, isCurrentUser }: UserRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onNavigate}
      className="flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer transition-colors"
      style={{ ['--hover-bg' as string]: 'var(--cr-bg-hover)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--cr-bg-hover, rgba(0,0,0,0.05))')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <UserAvatar user={user} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 leading-tight">
          <span className="font-semibold text-sm truncate" style={{ color: 'var(--cr-text-1)' }}>
            {user.firstName} {user.lastName}
          </span>
          {user.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-[#F5C518] shrink-0" />}
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--cr-text-muted)' }}>
          @{user.username}
        </p>
        {user.bio && (
          <p className="text-xs truncate mt-0.5 leading-snug" style={{ color: 'var(--cr-text-2)' }}>
            {user.bio}
          </p>
        )}
      </div>

      {/* Follow button — hidden for the viewer's own card */}
      {!isCurrentUser && (
        <FollowBtn user={user} isPending={isPending} onToggle={onToggle} />
      )}
    </motion.div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-2 py-2.5 animate-pulse">
      <div className="w-11 h-11 rounded-full shrink-0" style={{ background: 'var(--cr-border)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded-full w-2/5" style={{ background: 'var(--cr-border)' }} />
        <div className="h-2.5 rounded-full w-1/3" style={{ background: 'var(--cr-border)' }} />
      </div>
      <div className="w-20 h-7 rounded-lg shrink-0" style={{ background: 'var(--cr-border)' }} />
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function SocialListModal({
  isOpen,
  onClose,
  title,
  username,
  listType,
  currentUserId,
}: SocialListModalProps) {
  const router = useRouter()

  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [users,           setUsers]           = useState<SocialUser[]>([])
  const [loading,         setLoading]         = useState(true)
  const [fetching,        setFetching]        = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [page,            setPage]            = useState(1)
  const [totalPages,      setTotalPages]      = useState(1)
  const [pending,         setPending]         = useState<Set<string>>(new Set())

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (p: number, q: string, append: boolean) => {
    if (append) setFetching(true)
    else        setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ page: String(p), limit: '20' })
      if (q) qs.set('search', q)
      // Strip leading '@' — the username prop includes it for display but the API expects the raw slug
      const slug = username.startsWith('@') ? username.slice(1) : username
      const res = await fetch(`/api/users/${slug}/${listType}?${qs}`)
      if (!res.ok) throw new Error()
      const data: PaginatedUsers = await res.json()
      setUsers(prev => append ? [...prev, ...data.users] : data.users)
      setTotalPages(data.totalPages)
      setPage(p)
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }, [username, listType])

  // Trigger fetch when modal opens or debounced search changes
  useEffect(() => {
    if (!isOpen) return
    fetchUsers(1, debouncedSearch, false)
  }, [isOpen, debouncedSearch, fetchUsers])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setDebouncedSearch('')
      setUsers([])
      setPage(1)
      setLoading(true)
      setError(null)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSearchChange(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  function loadMore() {
    if (fetching || loading || page >= totalPages) return
    fetchUsers(page + 1, debouncedSearch, true)
  }

  async function toggleFollow(user: SocialUser) {
    const uid         = user.id
    const wasFollowing = user.isFollowing
    setPending(p => new Set(p).add(uid))

    // Optimistic update
    setUsers(prev => prev.map(u => u.id === uid ? {
      ...u,
      isFollowing:    !wasFollowing,
      isFriend:       !wasFollowing && u.isFollowedBy,
      followersCount: u.followersCount + (wasFollowing ? -1 : 1),
    } : u))

    try {
      const res = await fetch('/api/social/follow', {
        method:  wasFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ targetUserId: uid }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setUsers(prev => prev.map(u => u.id === uid ? {
        ...u,
        isFollowing:    wasFollowing,
        isFriend:       wasFollowing && u.isFollowedBy,
        followersCount: u.followersCount + (wasFollowing ? 1 : -1),
      } : u))
    } finally {
      setPending(p => { const n = new Set(p); n.delete(uid); return n })
    }
  }

  function navigateTo(u: SocialUser) {
    onClose()
    // u.username from the API is the raw slug (no '@')
    router.push(`/user/${u.username}`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] sm:w-[440px] max-h-[85vh] z-50 flex flex-col rounded-2xl overflow-hidden"
            style={{
              background:  'var(--cr-bg-card)',
              boxShadow:   '0 32px 64px -12px rgba(0,0,0,0.45), 0 0 0 1px var(--cr-border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: 'var(--cr-border)' }}
            >
              <h2 className="font-bold text-base" style={{ color: 'var(--cr-text-1)' }}>
                {title}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--cr-bg-surface)' }}
              >
                <X className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
              </motion.button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--cr-border)' }}>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--cr-text-muted)' }}
                />
                <input
                  type="text"
                  placeholder={`Search ${title.toLowerCase()}…`}
                  value={search}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition-colors"
                  style={{
                    background:   'var(--cr-bg-surface)',
                    borderColor:  'var(--cr-border)',
                    color:        'var(--cr-text-1)',
                  }}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {loading ? (
                <div className="space-y-1">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <p className="text-sm" style={{ color: 'var(--cr-text-muted)' }}>Failed to load</p>
                  <button
                    onClick={() => fetchUsers(1, debouncedSearch, false)}
                    className="text-xs font-semibold text-[#B38B00] dark:text-[#f6c68b] hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                  <div className="text-4xl">👥</div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--cr-text-1)' }}>
                    No {title.toLowerCase()} yet
                  </p>
                  {debouncedSearch && (
                    <p className="text-xs" style={{ color: 'var(--cr-text-muted)' }}>
                      No results for &quot;{debouncedSearch}&quot;
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {users.map(u => (
                      <UserRow
                        key={u.id}
                        user={u}
                        onNavigate={() => navigateTo(u)}
                        onToggle={() => toggleFollow(u)}
                        isPending={pending.has(u.id)}
                        isCurrentUser={u.id === currentUserId}
                      />
                    ))}
                  </AnimatePresence>

                  {page < totalPages && (
                    <div className="py-4 flex justify-center">
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={loadMore}
                        disabled={fetching}
                        className="px-5 py-2 rounded-xl text-sm font-semibold border disabled:opacity-50 transition-opacity"
                        style={{
                          borderColor: 'var(--cr-border)',
                          color:       'var(--cr-text-1)',
                          background:  'var(--cr-bg-surface)',
                        }}
                      >
                        {fetching
                          ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          : 'Load more'
                        }
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
