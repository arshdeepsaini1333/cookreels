'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, UserPlus, ChefHat, Users, Heart,
  Flame, Check, Sparkles, X, ChevronDown,
  UserCheck, UserX, Loader2, Eye, Trophy,
} from 'lucide-react'
import {
  useSocialCounts, useFriends, useFollowers, useFollowing, useAllUsers,
  useFollow, type SocialListHook,
} from '@/hooks/useSocial'
import type { SocialUser } from '@/types/social'

/* ─── Types ─────────────────────────────────────────────── */

type Tab = 'Friends' | 'Following' | 'Followers' | 'Add Friends'

/* ─── Animation helpers ──────────────────────────────────── */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const cardReveal = {
  hidden:  { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
}

const fadeSlide = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.45, ease: EASE, delay },
})

/* ─── Sidebar helpers ──────────────────────────────────────── */

type ActivityEntry = {
  id: string
  username: string
  displayName: string
  profileImage: string | null
  recentPostTitle: string
  recentPostType: 'reel' | 'recipe'
  postedAt: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return `${diff}s`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

type TrendingRecipeUser = {
  id: string
  username: string
  firstName: string
  lastName: string
  profileImage: string | null
  isVerified: boolean
}

type TrendingRecipe = {
  id: string
  title: string
  likeCount: number
  coverImage: string | null
  cuisine: string | null
  description?: string | null
  cookTime?: number | null
  prepTime?: number | null
  servings?: number | null
  createdAt?: string | null
  difficulty?: string | null
  user: TrendingRecipeUser
}

type TopCreator = {
  id: string
  username: string
  firstName: string
  lastName: string
  profileImage: string | null
  isVerified: boolean
  cuisineSpecialty: string | null
  postCount: number
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function cuisineEmoji(cuisine: string | null): string {
  const c = (cuisine ?? '').toLowerCase()
  if (c.includes('biryani') || c.includes('rice'))                   return '🍚'
  if (c.includes('indian') || c.includes('curry'))                   return '🍛'
  if (c.includes('italian') || c.includes('pasta') || c.includes('pizza')) return '🍝'
  if (c.includes('chinese') || c.includes('asian'))                  return '🥡'
  if (c.includes('mexican'))                                         return '🌮'
  if (c.includes('japanese') || c.includes('sushi'))                 return '🍱'
  if (c.includes('thai'))                                            return '🍜'
  if (c.includes('dessert') || c.includes('sweet') || c.includes('cake')) return '🍰'
  if (c.includes('soup'))                                            return '🍲'
  if (c.includes('salad'))                                           return '🥗'
  return '🍽'
}

/* ─── Avatar ─────────────────────────────────────────────── */

const GRADIENTS = [
  'from-pink-400 to-rose-500', 'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',  'from-violet-400 to-indigo-500',
  'from-fuchsia-400 to-purple-500', 'from-green-400 to-emerald-500',
  'from-sky-400 to-blue-500',   'from-red-400 to-rose-500',
  'from-yellow-400 to-amber-500', 'from-lime-400 to-green-500',
]

function avatarGradient(username: string) {
  return GRADIENTS[username.charCodeAt(0) % GRADIENTS.length]
}

function initials(u: SocialUser) {
  return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '?'
}

interface AvatarProps {
  user: SocialUser
  size?: 'sm' | 'md' | 'lg'
  rounded?: string
}

function Avatar({ user, size = 'md', rounded = 'rounded-2xl' }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [user.profileImage])
  const dim = { sm: 'w-10 h-10 text-sm', md: 'w-14 h-14 text-lg', lg: 'w-16 h-16 text-xl' }[size]
  const grad = avatarGradient(user.username)

  if (user.profileImage && !failed && !/googleusercontent\.com/i.test(user.profileImage)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.profileImage}
        alt={user.username}
        className={`${dim} ${rounded} object-cover shadow-md shrink-0`}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div className={`${dim} ${rounded} bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold shadow-md shrink-0`}>
      {initials(user)}
    </div>
  )
}

function SquareAvatar({
  src, alt, initial, gradient, className, imgClassName,
}: {
  src?: string | null; alt: string; initial: string; gradient: string; className: string; imgClassName: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  const showPhoto = src && !failed && !/googleusercontent\.com/i.test(src)
  return (
    <div className={`${className} bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-sm`}>
      {showPhoto
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt={alt} className={imgClassName} onError={() => setFailed(true)} />
        : <span>{initial}</span>
      }
    </div>
  )
}

/* ─── Follow button ──────────────────────────────────────── */

interface FollowBtnProps {
  user: SocialUser
  isPending: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
}

function FollowBtn({ user, isPending, onToggle, size = 'md' }: FollowBtnProps) {
  const pad = size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2 text-xs'
  const handleClick = (e: React.MouseEvent) => { e.stopPropagation(); onToggle() }

  if (isPending) {
    return (
      <button disabled onClick={e => e.stopPropagation()} className={`${pad} rounded-xl bg-zinc-100 dark:bg-zinc-700/70 text-zinc-400 flex items-center gap-1.5 font-semibold shrink-0`}>
        <Loader2 className="w-3 h-3 animate-spin" />
      </button>
    )
  }

  if (user.isFriend) {
    return (
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        title="Click to unfollow"
        className={`${pad} rounded-xl bg-gradient-to-r from-[#F5C518] to-[#FFD84D] dark:from-[#f6c68b] dark:to-[#e8952a] text-[#1A1A1A] dark:text-white font-bold shadow-md shadow-[#F5C518]/30 dark:shadow-[#e8952a]/25 flex items-center gap-1.5 shrink-0`}
      >
        <Users className="w-3 h-3" />Friends
      </motion.button>
    )
  }

  if (user.isFollowing) {
    return (
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        className={`${pad} rounded-xl bg-[#F5C518]/15 dark:bg-[#f6c68b]/15 border border-[#F5C518]/50 dark:border-[#f6c68b]/40 text-[#B38B00] dark:text-[#f6c68b] font-semibold flex items-center gap-1.5 shrink-0`}
      >
        <UserCheck className="w-3 h-3" />Following
      </motion.button>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      className={`${pad} rounded-xl bg-gradient-to-r from-[#F5C518] to-[#FFD84D] dark:from-[#f6c68b] dark:to-[#e8952a] text-[#1A1A1A] dark:text-white font-semibold shadow-md shadow-[#F5C518]/30 dark:shadow-[#e8952a]/25 flex items-center gap-1.5 shrink-0`}
    >
      <UserPlus className="w-3 h-3" />Follow
    </motion.button>
  )
}

/* ─── Skeleton card ──────────────────────────────────────── */

function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/50 rounded-3xl animate-pulse ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-3/4" />
          <div className="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-1/2" />
        </div>
      </div>
      {!compact && (
        <>
          <div className="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-full mb-2" />
          <div className="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-4/5 mb-4" />
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
        </>
      )}
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/50 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
      <div className="w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-1/3" />
        <div className="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-1/2" />
        <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full w-2/3" />
      </div>
      <div className="w-20 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-xl shrink-0" />
    </div>
  )
}

/* ─── Empty state ────────────────────────────────────────── */

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-lg mb-1">{title}</h3>
      <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs">{sub}</p>
    </motion.div>
  )
}

/* ─── Error state ────────────────────────────────────────── */

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-3">Failed to load</p>
      <button
        onClick={onRetry}
        className="text-xs font-semibold text-[#B38B00] dark:text-[#f6c68b] hover:underline"
      >
        Try again
      </button>
    </div>
  )
}

/* ─── Friend card (grid, Friends tab) ───────────────────── */

interface FriendCardProps { user: SocialUser; onToggle: () => void; isPending: boolean }

function FriendCard({ user, onToggle, isPending }: FriendCardProps) {
  const router = useRouter()
  const goToProfile = () => router.push(`/user/${user.username}`)

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={goToProfile}
      className="relative bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-zinc-200/70 dark:border-zinc-700/50 rounded-3xl p-5 shadow-md hover:shadow-xl hover:shadow-[#F5C518]/10 dark:hover:shadow-[#f6c68b]/10 transition-shadow duration-300 overflow-hidden cursor-pointer group"
    >
      <div className="absolute -top-14 -right-14 w-36 h-36 rounded-full bg-[#F5C518]/6 dark:bg-[#f6c68b]/6 blur-2xl group-hover:bg-[#F5C518]/14 dark:group-hover:bg-[#f6c68b]/14 transition-all duration-500 pointer-events-none" />

      <div className="relative w-16 h-16 mb-3">
        <Avatar user={user} size="lg" />
      </div>

      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px] leading-tight">
        {user.firstName} {user.lastName}
        {user.isVerified && <Check className="inline w-3.5 h-3.5 ml-1 text-[#F5C518]" strokeWidth={3} />}
      </h3>
      <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">@{user.username}</p>
      {user.bio && (
        <p className="text-zinc-600 dark:text-zinc-300 text-xs mt-2 leading-relaxed line-clamp-2">{user.bio}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
        {user.cuisineSpecialty && (
          <span className="inline-flex items-center gap-1 bg-[#F5C518]/15 dark:bg-[#f6c68b]/15 text-[#B38B00] dark:text-[#f6c68b] text-[10px] font-semibold px-2.5 py-1 rounded-full border border-[#F5C518]/25 dark:border-[#f6c68b]/25">
            🍽 {user.cuisineSpecialty}
          </span>
        )}
        {user.level && (
          <span className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 text-[10px] font-medium px-2.5 py-1 rounded-full">
            <ChefHat className="w-2.5 h-2.5" />{user.level}
          </span>
        )}
      </div>

      <p className="text-zinc-400 dark:text-zinc-500 text-[11px] mb-4 flex items-center gap-1">
        <Users className="w-3 h-3" />{user.followersCount.toLocaleString()} followers
      </p>

      {/* View Profile button — stops propagation so it doesn't double-fire the card click */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={e => { e.stopPropagation(); goToProfile() }}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#F5C518]/30 dark:shadow-[#e8952a]/25"
        style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
      >
        <Eye className="w-3.5 h-3.5" />
        View Profile
      </motion.button>
    </motion.div>
  )
}

/* ─── Following card (row, Following tab) ───────────────── */

interface FollowingCardProps { user: SocialUser; onToggle: () => void; isPending: boolean }

function FollowingCard({ user, onToggle, isPending }: FollowingCardProps) {
  const router = useRouter()
  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ x: 4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      onClick={() => router.push(`/user/${user.username}`)}
      className="flex items-center gap-4 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-zinc-200/70 dark:border-zinc-700/50 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:shadow-[#F5C518]/8 dark:hover:shadow-[#f6c68b]/8 transition-shadow duration-300 cursor-pointer"
    >
      <div className="relative shrink-0">
        <Avatar user={user} size="md" />
        {user.isVerified && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-[#F5C518] to-[#FFD84D] dark:from-[#f6c68b] dark:to-[#e8952a] flex items-center justify-center shadow-sm">
            <Check className="w-2.5 h-2.5 text-[#1A1A1A]" strokeWidth={3} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight truncate">
            {user.firstName} {user.lastName}
          </h3>
          {user.isFriend && (
            <span className="text-[9px] bg-[#F5C518]/15 dark:bg-[#f6c68b]/15 text-[#B38B00] dark:text-[#f6c68b] font-bold px-2 py-0.5 rounded-full shrink-0">
              Friends
            </span>
          )}
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">@{user.username}</p>
        {user.cuisineSpecialty && (
          <p className="text-zinc-600 dark:text-zinc-300 text-xs mt-1 truncate">{user.cuisineSpecialty}</p>
        )}
        <p className="text-zinc-400 dark:text-zinc-500 text-[11px] mt-1">
          {user.followersCount.toLocaleString()} followers · {user.followingCount.toLocaleString()} following
        </p>
      </div>

      <FollowBtn user={user} isPending={isPending} onToggle={onToggle} size="sm" />
    </motion.div>
  )
}

/* ─── Follower card (grid, Followers tab) ───────────────── */

interface FollowerCardProps { user: SocialUser; onToggle: () => void; isPending: boolean }

function FollowerCard({ user, onToggle, isPending }: FollowerCardProps) {
  const router = useRouter()
  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={() => router.push(`/user/${user.username}`)}
      className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-zinc-200/70 dark:border-zinc-700/50 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:shadow-[#F5C518]/8 dark:hover:shadow-[#f6c68b]/8 transition-shadow duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative shrink-0">
          <Avatar user={user} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight">
            {user.firstName} {user.lastName}
            {user.isVerified && <Check className="inline w-3 h-3 ml-1 text-[#F5C518]" strokeWidth={3} />}
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">@{user.username}</p>
        </div>
        <FollowBtn user={user} isPending={isPending} onToggle={onToggle} size="sm" />
      </div>

      {user.bio && (
        <div className="bg-[#F5C518]/8 dark:bg-[#f6c68b]/6 border border-[#F5C518]/15 dark:border-[#f6c68b]/15 rounded-xl px-3 py-2 flex items-start gap-2">
          <Sparkles className="w-3 h-3 text-[#B38B00] dark:text-[#e8952a] shrink-0 mt-0.5" />
          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium line-clamp-2">{user.bio}</p>
        </div>
      )}
    </motion.div>
  )
}

/* ─── User card for Add Friends tab ─────────────────────── */

interface AddUserCardProps { user: SocialUser; onToggle: () => void; isPending: boolean }

function AddUserCard({ user, onToggle, isPending }: AddUserCardProps) {
  const router = useRouter()
  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={() => router.push(`/user/${user.username}`)}
      className="relative bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-zinc-200/70 dark:border-zinc-700/50 rounded-3xl p-4 shadow-md hover:shadow-xl hover:shadow-[#F5C518]/10 dark:hover:shadow-[#f6c68b]/10 transition-shadow duration-300 overflow-hidden cursor-pointer"
    >
      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[#F5C518]/6 dark:bg-[#f6c68b]/6 blur-2xl pointer-events-none" />

      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar user={user} size="md" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">
              {user.firstName} {user.lastName}
            </h3>
            {user.isVerified && <Check className="w-3.5 h-3.5 text-[#F5C518] shrink-0" strokeWidth={3} />}
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs">@{user.username}</p>
          {user.cuisineSpecialty && (
            <p className="text-zinc-600 dark:text-zinc-300 text-xs mt-0.5 font-medium truncate">{user.cuisineSpecialty}</p>
          )}
          <p className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-0.5 flex items-center gap-1">
            <Users className="w-2.5 h-2.5" />{user.followersCount.toLocaleString()} followers
          </p>
        </div>
        <FollowBtn user={user} isPending={isPending} onToggle={onToggle} size="sm" />
      </div>
    </motion.div>
  )
}

/* ─── Load more button ───────────────────────────────────── */

function LoadMoreBtn({ onClick, fetching }: { onClick: () => void; fetching: boolean }) {
  return (
    <div className="flex justify-center mt-6">
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={onClick}
        disabled={fetching}
        className="flex items-center gap-2 px-6 py-2.5 bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/50 rounded-2xl text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:border-[#F5C518]/40 dark:hover:border-[#f6c68b]/40 shadow-sm disabled:opacity-60"
      >
        {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
        {fetching ? 'Loading…' : 'Load more'}
      </motion.button>
    </div>
  )
}



/* ─── Right sidebar (desktop) ────────────────────────────── */

function RightPanel() {
  const router = useRouter()
  const [activity,     setActivity]     = useState<ActivityEntry[]>([])
  const [actLoading,   setActLoading]   = useState(true)
  const [recipes,      setRecipes]      = useState<TrendingRecipe[]>([])
  const [recLoading,   setRecLoading]   = useState(true)
  const [creators,     setCreators]     = useState<TopCreator[]>([])
  const [creatorsLoading, setCreatorsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/social/following/recent-posts')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.friends) setActivity(d.friends) })
      .catch(() => {})
      .finally(() => setActLoading(false))

    fetch('/api/recipes/recommended')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.recipes) {
          const sorted = [...d.recipes].sort((a: TrendingRecipe, b: TrendingRecipe) => b.likeCount - a.likeCount)
          setRecipes(shuffle(sorted).slice(0, 3))
        }
      })
      .catch(() => {})
      .finally(() => setRecLoading(false))

    fetch('/api/users/top-creators')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.creators) {
          setCreators(shuffle(d.creators as TopCreator[]).slice(0, 3))
        }
      })
      .catch(() => {})
      .finally(() => setCreatorsLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 w-72 shrink-0">

      <motion.div {...fadeSlide(0.12)} className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-zinc-200/70 dark:border-zinc-700/50 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-[#B38B00] dark:text-[#f6c68b]" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Top Creators</h3>
        </div>

        {creatorsLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-3/4" />
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">No top creators yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {creators.map((c) => {
              const grad = avatarGradient(c.username)
              const initial = `${c.firstName?.[0] ?? ''}${c.lastName?.[0] ?? ''}`.toUpperCase() || '?'
              return (
                <div key={c.id} className="flex items-center gap-3 group">
                  <SquareAvatar
                    src={c.profileImage}
                    alt={c.firstName}
                    initial={initial}
                    gradient={grad}
                    className="w-10 h-10 rounded-xl overflow-hidden shrink-0 text-sm"
                    imgClassName="w-full h-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {c.firstName} {c.lastName}
                      {c.isVerified && <Check className="inline w-3 h-3 ml-1 text-[#F5C518]" strokeWidth={3} />}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">@{c.username}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />{c.postCount} posts
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/user/${c.username}`)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#F5C518] to-[#FFD84D] text-[#1A1A1A] text-[10px] font-bold shadow-sm hover:shadow-md transition-shadow"
                  >
                    View
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      <motion.div {...fadeSlide(0.18)} className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-zinc-200/70 dark:border-zinc-700/50 rounded-3xl p-5 shadow-sm">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm mb-4">Friend Activity</h3>

        {actLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                <div className="flex-1 space-y-1.5 pt-0.5">
                  <div className="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-3/4" />
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full w-1/2" />
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-6">
            Follow people to see their latest posts here.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {activity.map((a, i) => {
              const grad = avatarGradient(a.username)
              const initial  = a.displayName?.[0]?.toUpperCase() ?? '?'
              return (
                <motion.a
                  key={a.id}
                  href={`/user/${a.username}`}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.35, ease: EASE }}
                  className="flex items-start gap-3 group"
                >
                  <SquareAvatar
                    src={a.profileImage}
                    alt={a.displayName}
                    initial={initial}
                    gradient={grad}
                    className="w-8 h-8 rounded-xl overflow-hidden shrink-0 text-[11px]"
                    imgClassName="w-full h-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                      <span className="font-semibold">{a.displayName}</span>
                      {' '}posted a {a.recentPostType === 'reel' ? '🎬 reel' : '🍽 recipe'}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">"{a.recentPostTitle}"</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{timeAgo(a.postedAt)} ago</p>
                  </div>
                </motion.a>
              )
            })}
          </div>
        )}
      </motion.div>

      <motion.div {...fadeSlide(0.24)} className="bg-gradient-to-br from-[#F5C518]/10 to-[#FFD84D]/5 dark:from-[#f6c68b]/8 dark:to-[#e8952a]/4 border border-[#F5C518]/25 dark:border-[#f6c68b]/25 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-[#B38B00] dark:text-[#e8952a]" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Trending Recipes</h3>
        </div>

        {recLoading ? (
          <div className="flex flex-col gap-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full w-4/5" />
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">No recipes yet.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recipes.map(r => (
              <button
                key={r.id}
                onClick={() => router.push(`/recipe/${r.id}`)}
                className="flex items-center gap-3 cursor-pointer group w-full text-left"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-base shadow-sm">
                  {r.coverImage
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={r.coverImage} alt={r.title} className="w-full h-full object-cover" />
                    : <span>{cuisineEmoji(r.cuisine)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-[#B38B00] dark:group-hover:text-[#f6c68b] transition-colors truncate">{r.title}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">by {r.user.firstName || r.user.username}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-0.5 mt-0.5">
                    <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />{fmtCount(r.likeCount)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Modals ─────────────────────────────────────────── */}
    </div>
  )
}

/* ─── Search bar ─────────────────────────────────────────── */

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function SearchBar({ value, onChange, placeholder = 'Search…' }: SearchBarProps) {
  return (
    <div className="relative mb-5">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-700/50 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 dark:focus:ring-[#f6c68b]/50 shadow-sm transition-shadow"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

/* ─── Tab content panels ─────────────────────────────────── */

interface TabPanelProps {
  hook: SocialListHook
  onToggle: (user: SocialUser) => void
  isPending: (id: string) => boolean
}

function FriendsPanel({ hook, onToggle, isPending }: TabPanelProps) {
  if (hook.loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )

  if (hook.error) return <ErrorState onRetry={hook.refetch} />

  if (!hook.users.length) return (
    <EmptyState icon="👥" title="No friends yet" sub="Follow people and when they follow back, you'll become friends!" />
  )

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {hook.users.map(u => (
          <FriendCard key={u.id} user={u} onToggle={() => onToggle(u)} isPending={isPending(u.id)} />
        ))}
      </motion.div>
      {hook.hasMore && <LoadMoreBtn onClick={hook.loadMore} fetching={hook.fetching} />}
    </>
  )
}

function FollowingPanel({ hook, onToggle, isPending }: TabPanelProps) {
  if (hook.loading) return (
    <div className="flex flex-col gap-3">
      {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
    </div>
  )

  if (hook.error) return <ErrorState onRetry={hook.refetch} />

  if (!hook.users.length) return (
    <EmptyState icon="🔍" title="Not following anyone yet" sub="Discover and follow chefs to see their content here." />
  )

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-3">
        {hook.users.map(u => (
          <FollowingCard key={u.id} user={u} onToggle={() => onToggle(u)} isPending={isPending(u.id)} />
        ))}
      </motion.div>
      {hook.hasMore && <LoadMoreBtn onClick={hook.loadMore} fetching={hook.fetching} />}
    </>
  )
}

function FollowersPanel({ hook, onToggle, isPending }: TabPanelProps) {
  if (hook.loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[...Array(6)].map((_, i) => <SkeletonCard key={i} compact />)}
    </div>
  )

  if (hook.error) return <ErrorState onRetry={hook.refetch} />

  if (!hook.users.length) return (
    <EmptyState icon="📭" title="No followers yet" sub="Share your profile and recipes to attract followers." />
  )

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hook.users.map(u => (
          <FollowerCard key={u.id} user={u} onToggle={() => onToggle(u)} isPending={isPending(u.id)} />
        ))}
      </motion.div>
      {hook.hasMore && <LoadMoreBtn onClick={hook.loadMore} fetching={hook.fetching} />}
    </>
  )
}

function AddFriendsPanel({ hook, onToggle, isPending }: TabPanelProps) {
  if (hook.loading) return (
    <div className="flex flex-col gap-3">
      {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
    </div>
  )

  if (hook.error) return <ErrorState onRetry={hook.refetch} />

  if (!hook.users.length) return (
    <EmptyState icon="🌐" title="No users found" sub="Try a different search term to discover more people." />
  )

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-3">
        {hook.users.map(u => (
          <AddUserCard key={u.id} user={u} onToggle={() => onToggle(u)} isPending={isPending(u.id)} />
        ))}
      </motion.div>
      {hook.hasMore && <LoadMoreBtn onClick={hook.loadMore} fetching={hook.fetching} />}
    </>
  )
}

/* ─── Main component ─────────────────────────────────────── */

export function FriendsPage({ username = 'Chef' }: { username?: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('Friends')
  const [search, setSearch]       = useState('')

  const { counts, refetch: refetchCounts } = useSocialCounts()

  const friendsHook    = useFriends(search,    activeTab === 'Friends')
  const followingHook  = useFollowing(search,  activeTab === 'Following')
  const followersHook  = useFollowers(search,  activeTab === 'Followers')
  const addUsersHook   = useAllUsers(search,   activeTab === 'Add Friends')
  const { toggle, isPending } = useFollow()

  const activeHook: SocialListHook = {
    Friends:       friendsHook,
    Following:     followingHook,
    Followers:     followersHook,
    'Add Friends': addUsersHook,
  }[activeTab]

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setSearch('')
  }

  const handleToggle = useCallback(async (user: SocialUser) => {
    const wasFollowing = user.isFollowing

    // Optimistic update
    activeHook.updateUser(user.id, {
      isFollowing: !wasFollowing,
      isFriend:    !wasFollowing && user.isFollowedBy,
    })

    const ok = await toggle(user.id, wasFollowing)

    if (!ok) {
      // Revert on failure
      activeHook.updateUser(user.id, {
        isFollowing: wasFollowing,
        isFriend:    wasFollowing && user.isFollowedBy,
      })
      return
    }

    refetchCounts()

    // Remove from list if they no longer belong there
    if (wasFollowing) {
      if (activeTab === 'Following') setTimeout(() => activeHook.removeUser(user.id), 600)
      if (activeTab === 'Friends')   setTimeout(() => activeHook.removeUser(user.id), 600)
    }
  }, [activeHook, activeTab, toggle, refetchCounts])

  const tabs: { label: Tab; count: number }[] = [
    { label: 'Friends',      count: counts.friendsCount   },
    { label: 'Following',    count: counts.followingCount },
    { label: 'Followers',    count: counts.followersCount },
    { label: 'Add Friends',  count: 0                     },
  ]

  const showSearch = activeTab !== 'Friends' || friendsHook.users.length > 0 || !!search

  return (
    <div className="flex gap-6 max-w-6xl mx-auto">

      {/* ── Main content ──────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Header */}
        <motion.div {...fadeSlide(0)} className="mb-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-heading font-bold text-3xl sm:text-4xl text-zinc-900 dark:text-zinc-100 leading-tight">
                Friends
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1.5 font-medium">
                Welcome back, {username}. Connect, cook, and discover together.
              </p>
            </div>

          </div>
        </motion.div>

        {/* Tab bar */}
        <motion.div {...fadeSlide(0.08)} className="flex gap-2 flex-wrap mb-6">
          {tabs.map(({ label, count }) => (
            <motion.button
              key={label}
              onClick={() => switchTab(label)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                activeTab === label
                  ? 'bg-gradient-to-r from-[#F5C518] to-[#FFD84D] dark:from-[#F5C518] dark:to-[#FFB800] text-[#1A1A1A] shadow-lg shadow-[#F5C518]/35'
                  : 'bg-zinc-900 dark:bg-zinc-900 border border-zinc-700 dark:border-zinc-700 text-white hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:border-zinc-600 dark:hover:border-zinc-600'
              }`}
            >
              {label === 'Add Friends' ? (
                <><UserPlus className="w-3.5 h-3.5" />{label}</>
              ) : (
                <>
                  {label}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold leading-none min-w-[1.25rem] text-center ${
                    activeTab === label
                      ? 'bg-black/20 text-[#1A1A1A]'
                      : 'bg-white/15 text-white/80'
                  }`}>
                    {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                  </span>
                </>
              )}
              {activeTab === label && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-2xl ring-2 ring-[#F5C518]/25 dark:ring-[#e8952a]/20"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </motion.div>

        {/* Search bar (shown for all tabs that support it) */}
        {showSearch && (
          <motion.div
            key={`search-${activeTab}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={
                activeTab === 'Add Friends' ? 'Search all users by name or username…' :
                activeTab === 'Friends'     ? 'Search your friends…' :
                activeTab === 'Following'   ? 'Search people you follow…' :
                'Search your followers…'
              }
            />
          </motion.div>
        )}

        {/* Tab panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {activeTab === 'Friends'     && <FriendsPanel     hook={activeHook} onToggle={handleToggle} isPending={isPending} />}
            {activeTab === 'Following'   && <FollowingPanel   hook={activeHook} onToggle={handleToggle} isPending={isPending} />}
            {activeTab === 'Followers'   && <FollowersPanel   hook={activeHook} onToggle={handleToggle} isPending={isPending} />}
            {activeTab === 'Add Friends' && (
              <div>
                {/* Inline add-friend header */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-2 bg-[#F5C518]/15 dark:bg-[#f6c68b]/15 rounded-xl">
                    <UserX className="w-4 h-4 text-[#B38B00] dark:text-[#f6c68b]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Discover People</h2>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs">Find and follow people on CookReels</p>
                  </div>
                </div>
                <AddFriendsPanel hook={activeHook} onToggle={handleToggle} isPending={isPending} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* ── Right sidebar ────────────────────────────────── */}
      <div className="hidden xl:block">
        <RightPanel />
      </div>

    </div>
  )
}
