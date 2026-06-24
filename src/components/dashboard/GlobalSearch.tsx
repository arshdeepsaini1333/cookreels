'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Loader2, ChevronLeft, Clapperboard } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { useTheme } from '@/context/ThemeContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchUser {
  id: string
  username: string
  firstName: string
  lastName: string
  profileImage: string | null
  isVerified: boolean
}

interface SearchRecipe {
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
  user: SearchUser
}

interface SearchReel {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  duration: number | null
  viewCount: number
  likeCount: number
  gradient: string | null
  emoji: string | null
  createdAt: string
  user: SearchUser
}

interface SearchResults {
  users: SearchUser[]
  recipes: SearchRecipe[]
  reels: SearchReel[]
}


// ─── Recent searches (cached client-side per browser/user) ────────────────────

type RecentEntry =
  | { type: 'user';   data: SearchUser }
  | { type: 'recipe'; data: SearchRecipe }
  | { type: 'reel';   data: SearchReel }

const RECENT_SEARCHES_LIMIT = 8
const RECENT_SEARCHES_KEY   = 'cr_recent_searches'

function recentEntryKey(entry: RecentEntry): string {
  return `${entry.type}:${entry.data.id}`
}

function recentStorageKey(userId?: string): string {
  return userId ? `${RECENT_SEARCHES_KEY}:${userId}` : RECENT_SEARCHES_KEY
}

function loadRecentSearches(userId?: string): RecentEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(recentStorageKey(userId))
    return raw ? (JSON.parse(raw) as RecentEntry[]) : []
  } catch {
    return []
  }
}

function saveRecentSearches(entries: RecentEntry[], userId?: string) {
  try {
    window.localStorage.setItem(recentStorageKey(userId), JSON.stringify(entries))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently
  }
}

export interface GlobalSearchProps {
  /** 'desktop' renders an inline input with an anchored dropdown; 'mobile' renders a full-screen overlay */
  variant?: 'desktop' | 'mobile'
  /** Called when the mobile overlay should close (back button / selection) */
  onClose?: () => void
  currentUserAvatar?: string | null
  currentUserName?: string
  currentUserId?: string
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── Result rows ──────────────────────────────────────────────────────────────

function UserRow({ user, isDark, onSelect }: { user: SearchUser; isDark: boolean; onSelect: () => void }) {
  const name = `${user.firstName} ${user.lastName}`.trim() || user.username
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150"
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(52,52,56,0.60)' : '#FFF3BF' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <UserAvatar src={user.profileImage} name={name} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
          {name}
        </p>
        <p className="text-xs truncate" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
          @{user.username}
        </p>
      </div>
    </button>
  )
}

function RecipeRow({ recipe, isDark, onSelect }: { recipe: SearchRecipe; isDark: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150"
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(52,52,56,0.60)' : '#FFF3BF' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      {recipe.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.coverImage} alt={recipe.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base" style={{ background: isDark ? '#343438' : '#E8E8E8' }}>
          🍽️
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
          {recipe.title}
        </p>
        <p className="text-xs truncate" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
          by @{recipe.user.username}
        </p>
      </div>
    </button>
  )
}

function ReelThumb({ url, title, isDark }: { url: string | null; title: string; isDark: boolean }) {
  const [ok, setOk] = useState<boolean | null>(url ? null : false)

  const placeholder = (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isDark ? '#343438' : '#E8E8E8' }}>
      <Clapperboard size={18} style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
    </div>
  )

  if (ok === true) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url!} alt={title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
    )
  }
  if (ok === null) {
    return (
      <div className="relative w-9 h-9 flex-shrink-0">
        {placeholder}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url!}
          alt={title}
          className="absolute inset-0 w-full h-full rounded-lg object-cover opacity-0"
          onLoad={e => { (e.currentTarget as HTMLImageElement).classList.remove('opacity-0'); setOk(true) }}
          onError={() => setOk(false)}
        />
      </div>
    )
  }
  return placeholder
}

function ReelRow({ reel, isDark, onSelect }: { reel: SearchReel; isDark: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150"
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(52,52,56,0.60)' : '#FFF3BF' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >
      <ReelThumb url={reel.thumbnailUrl} title={reel.title} isDark={isDark} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
          {reel.title}
        </p>
        <p className="text-xs truncate" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
          by @{reel.user.username}
        </p>
      </div>
    </button>
  )
}

function RecentRow({
  entry, isDark, onSelect, onRemove,
}: { entry: RecentEntry; isDark: boolean; onSelect: () => void; onRemove: () => void }) {
  const title = entry.type === 'user'
    ? (`${entry.data.firstName} ${entry.data.lastName}`.trim() || entry.data.username)
    : entry.data.title
  const subtitle = entry.type === 'user' ? `@${entry.data.username}` : `by @${entry.data.user.username}`
  const image = entry.type === 'user' ? entry.data.profileImage
    : entry.type === 'recipe' ? entry.data.coverImage
    : entry.data.thumbnailUrl
  const rounded = entry.type === 'user' ? 'rounded-full' : 'rounded-lg'

  return (
    <div
      className="w-full flex items-center rounded-xl transition-colors duration-150"
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(52,52,56,0.60)' : '#FFF3BF' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <button onClick={onSelect} className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left">
        {entry.type === 'user' ? (
          <UserAvatar src={image} name={title} size="md" />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={title} className={`w-9 h-9 ${rounded} object-cover flex-shrink-0`} />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base" style={{ background: isDark ? '#343438' : '#E8E8E8' }}>
            {entry.type === 'recipe' ? '🍽️' : '🎬'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
            {title}
          </p>
          <p className="text-xs truncate" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
            {subtitle}
          </p>
        </div>
      </button>
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        aria-label="Remove from recent searches"
        className="p-2 mr-1 rounded-full flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X size={13} style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
      </button>
    </div>
  )
}

function RecentList({
  entries, isDark, onSelect, onRemove, onClearAll,
}: {
  entries: RecentEntry[]
  isDark: boolean
  onSelect: (e: RecentEntry) => void
  onRemove: (e: RecentEntry) => void
  onClearAll: () => void
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
          Recent
        </span>
        <button onClick={onClearAll} className="text-[11px] font-semibold" style={{ color: '#F5C518' }}>
          Clear all
        </button>
      </div>
      {entries.map(entry => (
        <RecentRow
          key={recentEntryKey(entry)}
          entry={entry}
          isDark={isDark}
          onSelect={() => onSelect(entry)}
          onRemove={() => onRemove(entry)}
        />
      ))}
    </div>
  )
}

function SectionLabel({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>
      {children}
    </p>
  )
}

// ─── Results list (shared by both variants) ────────────────────────────────────

function ResultsList({
  loading, results, isDark, onSelectUser, onSelectRecipe, onSelectReel,
}: {
  loading: boolean
  results: SearchResults | null
  isDark: boolean
  onSelectUser: (u: SearchUser) => void
  onSelectRecipe: (r: SearchRecipe) => void
  onSelectReel: (r: SearchReel) => void
}) {
  if (loading && !results) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={18} className="animate-spin" style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
      </div>
    )
  }

  const hasUsers   = (results?.users ?? []).length > 0
  const hasRecipes = (results?.recipes ?? []).length > 0
  const hasReels   = (results?.reels ?? []).length > 0

  if (!hasUsers && !hasRecipes && !hasReels) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-4">
        <span className="text-3xl mb-2">🔍</span>
        <p className="text-sm font-medium" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>No results found</p>
        <p className="text-xs mt-0.5" style={{ color: isDark ? '#71717A' : '#9CA3AF' }}>Try a different name, recipe, or reel title.</p>
      </div>
    )
  }

  return (
    <div className="py-1.5">
      {hasUsers && (
        <div>
          <SectionLabel isDark={isDark}>People</SectionLabel>
          {results!.users.map(u => (
            <UserRow key={u.id} user={u} isDark={isDark} onSelect={() => onSelectUser(u)} />
          ))}
        </div>
      )}
      {hasRecipes && (
        <div>
          <SectionLabel isDark={isDark}>Recipes</SectionLabel>
          {results!.recipes.map(r => (
            <RecipeRow key={r.id} recipe={r} isDark={isDark} onSelect={() => onSelectRecipe(r)} />
          ))}
        </div>
      )}
      {hasReels && (
        <div>
          <SectionLabel isDark={isDark}>Reels</SectionLabel>
          {results!.reels.map(r => (
            <ReelRow key={r.id} reel={r} isDark={isDark} onSelect={() => onSelectReel(r)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function GlobalSearch({
  variant = 'desktop',
  onClose,
  currentUserAvatar,
  currentUserName,
  currentUserId,
}: GlobalSearchProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [value, setValue]     = useState('')
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<RecentEntry[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLInputElement>(null)
  const debouncedValue = useDebounce(value.trim(), 300)

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Load this browser/user's cached recent searches on mount
  useEffect(() => {
    setRecentSearches(loadRecentSearches(currentUserId))
  }, [currentUserId])

  // Auto-focus the input when the mobile overlay opens
  useEffect(() => {
    if (variant === 'mobile') inputRef.current?.focus()
  }, [variant])

  useEffect(() => {
    if (!debouncedValue) { setResults(null); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedValue)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setResults(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedValue])

  // Close the desktop dropdown on outside click
  useEffect(() => {
    if (variant !== 'desktop') return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [variant])

  const reset = useCallback(() => {
    setValue('')
    setResults(null)
    setFocused(false)
  }, [])

  const addRecentSearch = useCallback((entry: RecentEntry) => {
    setRecentSearches(prev => {
      const key = recentEntryKey(entry)
      const next = [entry, ...prev.filter(p => recentEntryKey(p) !== key)].slice(0, RECENT_SEARCHES_LIMIT)
      saveRecentSearches(next, currentUserId)
      return next
    })
  }, [currentUserId])

  const removeRecentSearch = useCallback((entry: RecentEntry) => {
    setRecentSearches(prev => {
      const next = prev.filter(p => recentEntryKey(p) !== recentEntryKey(entry))
      saveRecentSearches(next, currentUserId)
      return next
    })
  }, [currentUserId])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    saveRecentSearches([], currentUserId)
  }, [currentUserId])

  const handleSelectUser = useCallback((user: SearchUser) => {
    addRecentSearch({ type: 'user', data: user })
    reset()
    onClose?.()
    router.push(`/user/${user.username}`)
  }, [addRecentSearch, reset, onClose, router])

  const handleSelectRecipe = useCallback((recipe: SearchRecipe) => {
    addRecentSearch({ type: 'recipe', data: recipe })
    setFocused(false)
    onClose?.()
    router.push(`/recipe/${recipe.id}`)
  }, [addRecentSearch, onClose, router])

  const handleSelectReel = useCallback((reel: SearchReel) => {
    addRecentSearch({ type: 'reel', data: reel })
    setFocused(false)
    onClose?.()
    router.push(`/reel/${reel.id}`)
  }, [addRecentSearch, onClose, router])

  const handleSelectRecent = useCallback((entry: RecentEntry) => {
    if (entry.type === 'user') handleSelectUser(entry.data)
    else if (entry.type === 'recipe') handleSelectRecipe(entry.data)
    else handleSelectReel(entry.data)
  }, [handleSelectUser, handleSelectRecipe, handleSelectReel])

  const hasQuery = debouncedValue.length > 0
  const showDropdown = variant === 'desktop' && focused && (hasQuery || recentSearches.length > 0)

  const inputBox = (
    <motion.div
      animate={{ borderColor: focused ? 'var(--cr-accent-border, rgba(245,197,24,0.45))' : undefined }}
      transition={{ duration: 0.2 }}
      className="relative flex items-center rounded-2xl transition-colors duration-200"
      style={{
        background: isDark ? 'rgba(43,43,45,0.80)' : 'rgba(255,255,255,0.90)',
        border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
      }}
    >
      {variant === 'mobile' && (
        <button onClick={onClose} aria-label="Back" className="pl-3 pr-1 flex-shrink-0">
          <ChevronLeft size={18} style={{ color: isDark ? '#A1A1AA' : '#666666' }} />
        </button>
      )}
      <span
        className="pointer-events-none flex-shrink-0"
        style={{ color: focused ? 'var(--cr-accent, #F5C518)' : isDark ? '#71717A' : '#9CA3AF', paddingLeft: variant === 'mobile' ? 8 : 14 }}
      >
        <Search size={15} strokeWidth={2.1} />
      </span>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="Search users, recipes, or reels…"
        className="w-full pl-2 pr-4 py-2.5 bg-transparent text-sm outline-none rounded-2xl font-ui"
        style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}
      />

      {value && (
        <button onClick={reset} aria-label="Clear search" className="absolute right-3 flex-shrink-0">
          <X size={14} style={{ color: isDark ? '#71717A' : '#9CA3AF' }} />
        </button>
      )}
    </motion.div>
  )

  return (
    <>
      {variant === 'desktop' ? (
        <div ref={containerRef} className="relative w-full max-w-sm lg:max-w-md xl:max-w-lg">
          {inputBox}

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden backdrop-blur-2xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto"
                style={{
                  background: isDark ? 'rgba(43,43,45,0.97)' : 'rgba(255,255,255,0.97)',
                  border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
                }}
              >
                {hasQuery ? (
                  <ResultsList
                    loading={loading}
                    results={results}
                    isDark={isDark}
                    onSelectUser={handleSelectUser}
                    onSelectRecipe={handleSelectRecipe}
                    onSelectReel={handleSelectReel}
                  />
                ) : (
                  <RecentList
                    entries={recentSearches}
                    isDark={isDark}
                    onSelect={handleSelectRecent}
                    onRemove={removeRecentSearch}
                    onClearAll={clearRecentSearches}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : mounted ? createPortal(
        // z-[110]: must sit above other full-screen mobile overlays (e.g. the
        // Reels page's immersive feed at z-[100]) or this never becomes visible.
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex flex-col"
          style={{ background: isDark ? '#1E1E1F' : '#F5F5F5' }}
        >
          <div className="px-3 pt-4 pb-2 flex-shrink-0">{inputBox}</div>
          <div className="flex-1 overflow-y-auto px-2">
            {hasQuery ? (
              <ResultsList
                loading={loading}
                results={results}
                isDark={isDark}
                onSelectUser={handleSelectUser}
                onSelectRecipe={handleSelectRecipe}
                onSelectReel={handleSelectReel}
              />
            ) : recentSearches.length > 0 ? (
              <RecentList
                entries={recentSearches}
                isDark={isDark}
                onSelect={handleSelectRecent}
                onRemove={removeRecentSearch}
                onClearAll={clearRecentSearches}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <span className="text-3xl mb-2">🔍</span>
                <p className="text-sm font-medium" style={{ color: isDark ? '#F5F5F5' : '#1A1A1A' }}>
                  Search for chefs, recipes, or reels
                </p>
              </div>
            )}
          </div>
        </motion.div>,
        document.body
      ) : null}

    </>
  )
}
