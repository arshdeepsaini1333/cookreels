'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SocialUser, SocialCounts, PaginatedUsers } from '@/types/social'

/* ── Debounce ─────────────────────────────────────────────── */

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/* ── Social counts ───────────────────────────────────────── */

export function useSocialCounts() {
  const [counts, setCounts] = useState<SocialCounts>({ friendsCount: 0, followersCount: 0, followingCount: 0 })
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/social/counts')
      if (res.ok) setCounts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { counts, loading, refetch }
}

/* ── Generic paginated list ──────────────────────────────── */

export interface SocialListHook {
  users: SocialUser[]
  loading: boolean
  fetching: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  updateUser: (id: string, patch: Partial<SocialUser>) => void
  removeUser: (id: string) => void
  refetch: () => void
}

function useSocialList(endpoint: string, search: string, enabled: boolean): SocialListHook {
  const [users, setUsers]       = useState<SocialUser[]>([])
  const [loading, setLoading]   = useState(true)    // true on first load (no data yet)
  const [fetching, setFetching] = useState(false)   // true when re-fetching with existing data
  const [error, setError]       = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const fetchPage = useCallback(async (p: number, q: string) => {
    const params = new URLSearchParams({ page: String(p), limit: '20' })
    if (q) params.set('search', q)
    const res = await fetch(`/api/social/${endpoint}?${params}`)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json() as Promise<PaginatedUsers>
  }, [endpoint])

  const load = useCallback(async (p: number, q: string, append: boolean) => {
    if (append) setFetching(true)
    else        setLoading(true)
    try {
      const data = await fetchPage(p, q)
      setUsers(prev => append ? [...prev, ...data.users] : data.users)
      setTotalPages(data.totalPages)
      setError(null)
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
      setFetching(false)
    }
  }, [fetchPage])

  // Initial fetch or search/enabled change
  useEffect(() => {
    if (!enabled) return
    setPage(1)
    load(1, debouncedSearch, false)
  }, [enabled, debouncedSearch, load])

  function loadMore() {
    if (fetching || loading || page >= totalPages) return
    const next = page + 1
    setPage(next)
    load(next, debouncedSearch, true)
  }

  function updateUser(id: string, patch: Partial<SocialUser>) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u))
  }

  function removeUser(id: string) {
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  function refetch() {
    setPage(1)
    load(1, debouncedSearch, false)
  }

  return {
    users, loading, fetching, error,
    hasMore: page < totalPages,
    loadMore, updateUser, removeUser, refetch,
  }
}

/* ── Named hooks ─────────────────────────────────────────── */

export function useFriends(search = '',    enabled = true) { return useSocialList('friends',   search, enabled) }
export function useFollowers(search = '',  enabled = true) { return useSocialList('followers',  search, enabled) }
export function useFollowing(search = '',  enabled = true) { return useSocialList('following',  search, enabled) }
export function useAllUsers(search = '',   enabled = true) { return useSocialList('users',      search, enabled) }

/* ── Follow / unfollow mutation ──────────────────────────── */

export function useFollow() {
  const [pending, setPending] = useState<Set<string>>(new Set())

  async function toggle(targetUserId: string, currentlyFollowing: boolean): Promise<boolean> {
    setPending(p => new Set(p).add(targetUserId))
    try {
      const res = await fetch('/api/social/follow', {
        method: currentlyFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })
      return res.ok
    } catch {
      return false
    } finally {
      setPending(p => { const n = new Set(p); n.delete(targetUserId); return n })
    }
  }

  return {
    toggle,
    isPending: (id: string) => pending.has(id),
  }
}
