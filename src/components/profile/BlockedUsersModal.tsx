'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Loader2, BadgeCheck, Ban } from 'lucide-react'
import type { BlockedUser, PaginatedBlockedUsers } from '@/types/social'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { BlockConfirmModal } from '@/components/shared/BlockConfirmModal'

export interface BlockedUsersModalProps {
  isOpen:  boolean
  onClose: () => void
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function BlockedUserRow({
  user, onUnblock, isPending,
}: { user: BlockedUser; onUnblock: () => void; isPending: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 px-2 py-2.5 rounded-xl"
    >
      <UserAvatar src={user.profileImage} name={`${user.firstName} ${user.lastName}`} size="lg" />

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
      </div>

      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        onClick={onUnblock}
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 disabled:opacity-60 flex items-center gap-1.5"
        style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' }}
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Unblock'}
      </motion.button>
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

export function BlockedUsersModal({ isOpen, onClose }: BlockedUsersModalProps) {
  const [search,          setSearch]          = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [users,           setUsers]           = useState<BlockedUser[]>([])
  const [loading,         setLoading]         = useState(true)
  const [fetching,        setFetching]        = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [page,            setPage]            = useState(1)
  const [totalPages,      setTotalPages]      = useState(1)
  const [pending,         setPending]         = useState<Set<string>>(new Set())
  const [confirmTarget,   setConfirmTarget]   = useState<BlockedUser | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchUsers = useCallback(async (p: number, q: string, append: boolean) => {
    if (append) setFetching(true)
    else        setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ page: String(p), limit: '20' })
      if (q) qs.set('search', q)
      const res = await fetch(`/api/social/blocked?${qs}`)
      if (!res.ok) throw new Error()
      const data: PaginatedBlockedUsers = await res.json()
      setUsers(prev => append ? [...prev, ...data.users] : data.users)
      setTotalPages(data.totalPages)
      setPage(p)
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    fetchUsers(1, debouncedSearch, false)
  }, [isOpen, debouncedSearch, fetchUsers])

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setDebouncedSearch('')
      setUsers([])
      setPage(1)
      setLoading(true)
      setError(null)
      setConfirmTarget(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  function handleSearchChange(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  function loadMore() {
    if (fetching || loading || page >= totalPages) return
    fetchUsers(page + 1, debouncedSearch, true)
  }

  async function confirmUnblock() {
    if (!confirmTarget) return
    const uid = confirmTarget.id
    setPending(p => new Set(p).add(uid))
    try {
      const res = await fetch('/api/social/block', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ targetUserId: uid }),
      })
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== uid))
      }
    } finally {
      setPending(p => { const n = new Set(p); n.delete(uid); return n })
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="blocked-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              style={{ zIndex: 10100 }}
              onClick={onClose}
            />

            <motion.div
              key="blocked-panel"
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.94, y: 24 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] sm:w-[440px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
              style={{
                zIndex:     10101,
                background: 'var(--cr-bg-card)',
                boxShadow:  '0 32px 64px -12px rgba(0,0,0,0.45), 0 0 0 1px var(--cr-border)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 border-b shrink-0"
                style={{ borderColor: 'var(--cr-border)' }}
              >
                <h2 className="font-bold text-base" style={{ color: 'var(--cr-text-1)' }}>
                  Blocked Users
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

              <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--cr-border)' }}>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--cr-text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search blocked users…"
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition-colors"
                    style={{
                      background:  'var(--cr-bg-surface)',
                      borderColor: 'var(--cr-border)',
                      color:       'var(--cr-text-1)',
                    }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2">
                {loading ? (
                  <div className="space-y-1">
                    {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <p className="text-sm" style={{ color: 'var(--cr-text-muted)' }}>Failed to load</p>
                    <button
                      onClick={() => fetchUsers(1, debouncedSearch, false)}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: 'var(--cr-accent)' }}
                    >
                      Try again
                    </button>
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--cr-bg-surface)' }}
                    >
                      <Ban className="w-6 h-6" style={{ color: 'var(--cr-text-muted)' }} />
                    </div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--cr-text-1)' }}>
                      No blocked users
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
                        <BlockedUserRow
                          key={u.id}
                          user={u}
                          onUnblock={() => setConfirmTarget(u)}
                          isPending={pending.has(u.id)}
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

      <BlockConfirmModal
        isOpen={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmUnblock}
        userName={confirmTarget ? `${confirmTarget.firstName} ${confirmTarget.lastName}` : ''}
        action="unblock"
      />
    </>
  )
}
