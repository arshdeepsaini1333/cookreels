'use client'

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Compass } from 'lucide-react'
import {
  type ExploreItem,
  type ExploreRecipe,
  type ExploreReel,
} from '@/components/shared/ExploreViewer'
import { ReelThumbnail } from '@/components/shared/ReelThumbnail'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'All' | 'Trending' | 'Recent' | 'Recipes' | 'Reels'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FALLBACK_GRADIENTS = [
  'from-orange-500 to-rose-600',   'from-amber-500 to-orange-700',
  'from-pink-400 to-fuchsia-600',  'from-emerald-500 to-teal-700',
  'from-red-500 to-orange-600',    'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',     'from-yellow-500 to-amber-600',
]

function gradInfo(g: string | null, idx: number) {
  const val = g ?? FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length]
  return val.startsWith('from-')
    ? { cls: `bg-gradient-to-br ${val}`, style: {} as React.CSSProperties }
    : { cls: '', style: { background: val } as React.CSSProperties }
}

// Interleave: 2 recipes → 1 reel, repeating.
function interleave(recipes: ExploreRecipe[], reels: ExploreReel[]): ExploreItem[] {
  const items: ExploreItem[] = []
  let ri = 0, li = 0
  while (ri < recipes.length || li < reels.length) {
    if (ri < recipes.length) items.push({ type: 'recipe', data: recipes[ri++] })
    if (ri < recipes.length) items.push({ type: 'recipe', data: recipes[ri++] })
    if (li < reels.length)   items.push({ type: 'reel',   data: reels[li++]   })
  }
  return items
}

// Scatter: randomly mix recipes and reels for a non-repeating feel (used by Trending).
function scatter(recipes: ExploreRecipe[], reels: ExploreReel[]): ExploreItem[] {
  const pool: ExploreItem[] = [
    ...recipes.map(d => ({ type: 'recipe' as const, data: d })),
    ...reels.map(d   => ({ type: 'reel'   as const, data: d })),
  ]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

// ─── Recipe card (short ~210px) ───────────────────────────────────────────────

interface RecipeCardProps { recipe: ExploreRecipe; idx: number; onOpen: () => void }

const RecipeCard = memo(function RecipeCard({ recipe, idx, onOpen }: RecipeCardProps) {
  const { cls, style } = gradInfo(null, idx)
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      className={`relative overflow-hidden rounded-2xl cursor-pointer w-full ${cls}`}
      style={{ height: 210, ...style }}
    >
      {recipe.coverImage && (
        <img
          src={recipe.coverImage}
          alt={recipe.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 px-3 pb-2.5 pointer-events-none">
        <p className="text-white text-xs font-bold truncate drop-shadow leading-tight">{recipe.title}</p>
        <p className="text-white/60 text-[10px] truncate mt-0.5 drop-shadow">@{recipe.user.username}</p>
      </div>
    </motion.div>
  )
})

// ─── Reel card (tall ~380px, portrait) ───────────────────────────────────────

function fmtDuration(secs: number | null): string | null {
  if (!secs) return null
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

interface ReelCardProps { reel: ExploreReel; idx: number; onOpen: () => void }

const ReelCard = memo(function ReelCard({ reel, idx, onOpen }: ReelCardProps) {
  const { cls, style } = gradInfo(reel.gradient, idx)
  const duration = fmtDuration(reel.duration)
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      className={`relative overflow-hidden rounded-2xl cursor-pointer w-full group ${cls}`}
      style={{ height: 380, ...style }}
    >
      <ReelThumbnail
        videoUrl={reel.videoUrl}
        thumbnailUrl={reel.thumbnailUrl}
        imgClassName="transition-transform duration-500 group-hover:scale-105"
      />
      <div className={`absolute inset-0 bg-gradient-to-br ${reel.gradient?.startsWith('from-') ? reel.gradient : ''} opacity-0`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
      <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl transition-all duration-200 group-hover:bg-white/30 group-hover:scale-110">
          <Play className="w-7 h-7 text-white fill-white ml-0.5" />
        </div>
      </div>

      {duration && (
        <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-[9px] text-white font-bold pointer-events-none">
          {duration}
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 px-3 pb-3 pointer-events-none">
        <p className="text-white text-xs font-bold truncate drop-shadow-md leading-tight">{reel.title}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-white/60 text-[10px] truncate">@{reel.user.username}</span>
          {reel.likeCount != null && reel.likeCount > 0 && (
            <span className="text-white/60 text-[10px] shrink-0 ml-2">♥ {fmtNum(reel.likeCount)}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
})

// ─── Masonry grid ─────────────────────────────────────────────────────────────

function MasonryGrid({
  items,
  onOpen,
  cols = 'columns-2 sm:columns-3 lg:columns-4',
}: {
  items: ExploreItem[]
  onOpen: (idx: number) => void
  cols?: string
}) {
  return (
    <div className={`${cols} gap-2`}>
      {items.map((item, idx) => {
        const key = item.type === 'recipe' ? `r-${item.data.id}` : `rl-${item.data.id}`
        return (
          <div key={key} className="masonry-item break-inside-avoid mb-2">
            {item.type === 'recipe' ? (
              <RecipeCard recipe={item.data} idx={idx} onOpen={() => onOpen(idx)} />
            ) : (
              <ReelCard   reel={item.data}   idx={idx} onOpen={() => onOpen(idx)} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

const SKELETON_HEIGHTS = [210, 380, 210, 210, 380, 210, 380, 210, 210, 380, 210, 210]

function MasonrySkeleton({ cols = 'columns-2 sm:columns-3 lg:columns-4' }: { cols?: string }) {
  return (
    <div className={`${cols} gap-2`}>
      {SKELETON_HEIGHTS.map((h, i) => (
        <div key={i} className="break-inside-avoid mb-2 rounded-2xl animate-pulse"
             style={{ height: h, background: 'var(--cr-border)' }} />
      ))}
    </div>
  )
}

function AppendSkeleton({ cols = 'columns-2 sm:columns-3 lg:columns-4' }: { cols?: string }) {
  return (
    <div className={`${cols} gap-2 mt-2`}>
      {[210, 380, 210, 210, 380, 210].map((h, i) => (
        <div key={i} className="break-inside-avoid mb-2 rounded-2xl animate-pulse"
             style={{ height: h, background: 'var(--cr-border)' }} />
      ))}
    </div>
  )
}

// ─── Empty / end states ───────────────────────────────────────────────────────

function EmptyState({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <span className="text-6xl mb-4">🍽️</span>
      <p className="font-heading font-bold text-lg mb-1" style={{ color: 'var(--cr-text-1)' }}>Nothing here yet</p>
      <p className="text-sm" style={{ color: 'var(--cr-text-muted)' }}>{label ?? 'Be the first to post!'}</p>
    </div>
  )
}

// ─── Feed tab ─────────────────────────────────────────────────────────────────

function FeedTab({
  tab,
  onOpen,
  onItemsChange,
}: {
  tab: Tab
  onOpen: (items: ExploreItem[], idx: number) => void
  onItemsChange: (items: ExploreItem[]) => void
}) {
  const [allItems,    setAllItems]    = useState<ExploreItem[]>([])
  const [page,        setPage]        = useState(0)
  const [hasMore,     setHasMore]     = useState(true)
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef  = useRef<HTMLDivElement>(null)
  const fetchingRef  = useRef(false)
  const allItemsRef  = useRef<ExploreItem[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setAllItems([])
    allItemsRef.current = []
    setPage(0)
    setHasMore(true)
    fetchingRef.current = false

    fetch(`/api/explore?tab=${tab.toLowerCase()}&page=0`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const items = (tab === 'All' || tab === 'Recent')
          ? scatter(data.recipes ?? [], data.reels ?? [])
          : interleave(data.recipes ?? [], data.reels ?? [])
        allItemsRef.current = items
        setAllItems(items)
        onItemsChange(items)
        setHasMore(data.hasMore ?? false)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (fetchingRef.current || !hasMore || loadingMore) return
    fetchingRef.current = true
    const nextPage = page + 1
    setLoadingMore(true)

    fetch(`/api/explore?tab=${tab.toLowerCase()}&page=${nextPage}`)
      .then(r => r.json())
      .then(data => {
        const newItems = (tab === 'All' || tab === 'Trending' || tab === 'Recent')
          ? scatter(data.recipes ?? [], data.reels ?? [])
          : interleave(data.recipes ?? [], data.reels ?? [])
        const merged = [...allItemsRef.current, ...newItems]
        allItemsRef.current = merged
        setAllItems(merged)
        onItemsChange(merged)
        setHasMore(data.hasMore ?? false)
        setPage(nextPage)
      })
      .catch(() => {})
      .finally(() => { setLoadingMore(false); fetchingRef.current = false })
  }, [hasMore, loadingMore, page, tab]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loading) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '800px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, loading])

  const items = allItems

  const cols = tab === 'Reels'
    ? 'columns-2 md:columns-3 lg:columns-4'
    : 'columns-2 sm:columns-3 lg:columns-4'

  if (loading) return <MasonrySkeleton cols={cols} />

  if (allItems.length === 0) {
    const emptyLabel =
      tab === 'Recipes' ? 'No recipes posted yet.' :
      tab === 'Reels'   ? 'No reels posted yet.'   : 'Be the first to post!'
    return <EmptyState label={emptyLabel} />
  }

  return (
    <div>
      <MasonryGrid items={items} onOpen={(idx) => onOpen(items, idx)} cols={cols} />
      <div ref={sentinelRef} className="h-1" />
      {loadingMore && <AppendSkeleton cols={cols} />}
      {!loadingMore && !hasMore && allItems.length > 0 && (
        <p className="text-center text-xs py-8" style={{ color: 'var(--cr-text-muted)' }}>
          You&apos;ve seen everything ✓
        </p>
      )}
    </div>
  )
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'All',      label: 'All'      },
  { id: 'Trending', label: 'Trending' },
  { id: 'Recent',   label: 'Recent'   },
  { id: 'Recipes',  label: 'Recipes'  },
  { id: 'Reels',    label: 'Reels'    },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function ExplorePage({ username, currentUserAvatar, currentUserId }: {
  username?: string
  currentUserAvatar?: string | null
  currentUserId?: string
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('All')

  // Navigate to the canonical deep-link URL; Next.js intercepting routes
  // show the content as a modal while keeping this page in the background.
  const openViewer = useCallback((items: ExploreItem[], idx: number) => {
    const item = items[idx]
    if (!item) return
    if (item.type === 'recipe') {
      const ids = items.filter(i => i.type === 'recipe').map(i => i.data.id)
      try { sessionStorage.setItem('__cr_nav_ctx', JSON.stringify({ type: 'recipe', ids })) } catch {}
      router.push(`/recipe/${item.data.id}`)
    } else {
      const ids = items.filter(i => i.type === 'reel').map(i => i.data.id)
      try { sessionStorage.setItem('__cr_nav_ctx', JSON.stringify({ type: 'reel', ids })) } catch {}
      router.push(`/reel/${item.data.id}`)
    }
  }, [router])

  // No-op: items tracking is no longer needed since we use URL-based navigation.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleItemsChange = useCallback((_items: ExploreItem[]) => {}, [])

  const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

  return (
    <div className="max-w-5xl">

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mb-6"
      >
        <div className="flex items-center gap-2.5">
          <Compass className="w-6 h-6" style={{ color: 'var(--cr-accent)' }} />
          <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight" style={{ color: 'var(--cr-text-1)' }}>
            Explore
          </h1>
        </div>
        <p className="text-sm mt-0.5" style={{ color: 'var(--cr-text-muted)' }}>
          Discover recipes &amp; reels from the community
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
        className="flex gap-2 mb-6 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="relative shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200"
            style={tab === t.id
              ? { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }
              : { background: 'var(--cr-bg-card)', color: 'var(--cr-text-muted)', border: '1px solid var(--cr-border)' }
            }
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* Feed */}
      <FeedTab
        key={tab}
        tab={tab}
        onOpen={openViewer}
        onItemsChange={handleItemsChange}
      />
    </div>
  )
}
