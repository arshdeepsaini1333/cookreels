'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  Settings, Share2, Camera, MessageCircle,
  UserPlus, UserCheck, ChefHat, Flame, Heart, Play,
  Bookmark, Clock, Film, Eye, BadgeCheck,
  Lock, X, Edit3, Plus, ChevronRight,
  Key, EyeOff,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { useTheme } from '@/context/ThemeContext'
import { AddContentModal } from '@/components/shared/AddContentModal'
import { SocialListModal } from '@/components/profile/SocialListModal'
import type { SocialListType } from '@/components/profile/SocialListModal'
import { ImageCropModal, validateImageFile } from '@/components/profile/ImageCropModal'
import { EditProfileModal } from '@/components/profile/EditProfileModal'
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal'
// ─── Prop Types (data from server / DB) 

export interface ProfileUser {
  id: string
  name: string
  username: string
  bio: string | null
  verified: boolean
  isOnline: boolean
  topChef: boolean
  level: string
  avatar: string | null
  backgroundPicture?: string | null
  cuisineSpecialty: string | null
}

export interface ProfileStats {
  recipes: number
  reels: number
  followers: number
  following: number
  friends: number
}

export interface ProfileRecipe {
  id: string
  title: string
  coverImage: string | null
  cookTime: number | null
  prepTime: number | null
  likeCount: number
  difficulty: string | null   // 'EASY' | 'MEDIUM' | 'HARD' | null
  // Optional preloaded detail — when set the modal skips the extra API fetch
  description?: string | null
  servings?: number | null
  createdAt?: string | null
}

export interface ProfileReel {
  id: string
  title: string
  description?: string | null
  videoUrl: string
  thumbnailUrl: string | null
  duration: number | null     // seconds
  viewCount: number
  likeCount: number
}

export interface ProfileCollection {
  id: string
  name: string
  itemCount: number
  previewImages: string[]
}

export interface ProfilePageProps {
  user: ProfileUser
  stats: ProfileStats
  recipes: ProfileRecipe[]
  reels: ProfileReel[]
  collections: ProfileCollection[]
}

// ─── Animation Presets ────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const staggerContainer = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: delay } },
})

const cardReveal = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 28 },
  },
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: EASE, delay },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function fmtTime(minutes: number | null | undefined): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── Static UI Data (not in DB) ───────────────────────────────────────────────

const TABS     = ['Recipes', 'Reels', 'Saved', 'Liked'] as const
type ProfileTab = (typeof TABS)[number]

// Gradient fallbacks when a recipe/reel has no image
const CARD_GRADIENTS = [
  'from-orange-600 to-rose-600',    'from-amber-500 to-orange-700',
  'from-pink-400 to-fuchsia-600',   'from-yellow-500 to-amber-600',
  'from-emerald-500 to-teal-700',   'from-red-500 to-orange-600',
  'from-rose-400 to-pink-600',      'from-green-500 to-emerald-600',
  'from-violet-500 to-purple-600',  'from-cyan-500 to-blue-600',
  'from-indigo-500 to-violet-600',  'from-teal-500 to-emerald-600',
]

const DIFF_LABEL: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }
const DIFF_STYLE: Record<string, string> = {
  EASY:   'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  MEDIUM: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  HARD:   'bg-red-500/15 text-red-500',
}

// ─── AnimatedStat 

function AnimatedStat({ value, label }: { value: number; label: string }) {
  const ref  = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let frame: number
    let current = 0
    const increment = value / 60
    const tick = () => {
      current += increment
      if (current >= value) { setCount(value) }
      else { setCount(Math.floor(current)); frame = requestAnimationFrame(tick) }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value])

  return (
    <motion.div
      ref={ref}
      whileHover={{ scale: 1.08 }}
      className="flex flex-col items-center cursor-pointer select-none px-2 sm:px-3"
    >
      <span className="text-base sm:text-lg font-bold leading-tight" style={{ color: 'var(--cr-text-1)' }}>
        {fmt(count)}
      </span>
      <span className="text-[10px] sm:text-[11px] mt-0.5 font-medium" style={{ color: 'var(--cr-text-muted)' }}>
        {label}
      </span>
    </motion.div>
  )
}

// ─── Toggle ──────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
      style={{ background: on ? 'var(--cr-accent)' : 'var(--cr-border)' }}
    >
      <motion.div
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  )
}

// ─── RecipeCard ───

function RecipeCard({
  r, idx, saved, onSave, onClick,
}: {
  r: ProfileRecipe
  idx: number
  saved: boolean
  onSave: () => void
  onClick?: () => void
}) {
  const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length]
  const diffKey  = r.difficulty ?? ''

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ scale: 1.025, y: -4 }}
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
    >
      {/* Image or gradient placeholder */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {r.coverImage ? (
          <img
            src={r.coverImage}
            alt={r.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-4xl opacity-60">🍽️</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-all duration-300 flex items-center justify-center gap-2.5 opacity-0 group-hover:opacity-100">
          <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/35">
            <Heart className="w-4 h-4 text-white" />
          </button>
          <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/35">
            <Play className="w-4 h-4 text-white fill-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSave() }}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/35"
          >
            <Bookmark className="w-4 h-4 transition-colors" style={{ color: saved ? '#F5C518' : 'white', fill: saved ? '#F5C518' : 'transparent' }} />
          </button>
        </div>
        {/* Difficulty badge */}
        {diffKey && (
          <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${DIFF_STYLE[diffKey] ?? ''}`}>
            {DIFF_LABEL[diffKey] ?? diffKey}
          </span>
        )}
        {saved && (
          <div className="absolute top-2 right-2">
            <Bookmark className="w-4 h-4" style={{ color: '#F5C518', fill: '#F5C518' }} />
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <h4 className="font-semibold text-sm leading-tight line-clamp-1" style={{ color: 'var(--cr-text-1)' }}>
          {r.title}
        </h4>
        <div className="flex items-center justify-between mt-1.5">
          <span className="flex items-center gap-1" style={{ color: 'var(--cr-text-muted)' }}>
            <Clock className="w-3 h-3" />
            <span className="text-xs">{fmtTime((r.cookTime ?? 0) + (r.prepTime ?? 0))}</span>
          </span>
          <span className="flex items-center gap-1" style={{ color: 'var(--cr-text-muted)' }}>
            <Heart className="w-3 h-3" />
            <span className="text-xs">{fmt(r.likeCount)}</span>
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── ReelCard ─────────────────────────────────────────────────────────────────

function ReelCard({ r, idx, onClick }: { r: ProfileReel; idx: number; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)
  const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length]

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ scale: 1.03 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      className="relative rounded-xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: '9/16' }}
    >
      {/* Video as cover — falls back to thumbnail then gradient */}
      <video
        src={r.videoUrl}
        autoPlay
        muted
        loop
        playsInline
        poster={r.thumbnailUrl ?? undefined}
        className="absolute inset-0 w-full h-full object-cover"
        onError={e => { (e.currentTarget as HTMLVideoElement).style.display = 'none' }}
      />
      {/* Fallback gradient shown behind video while it loads */}
      {!r.videoUrl && (
        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-3xl opacity-50">🎬</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      {/* Play indicator */}
      <motion.div
        animate={{ scale: hovered ? 1.15 : 1, opacity: hovered ? 0.95 : 0.65 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
      </motion.div>
      {/* Duration */}
      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {fmtDuration(r.duration)}
      </div>
      {/* Hover stats */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-0 left-0 right-0 p-2"
          >
            <p className="text-white text-[11px] font-semibold leading-tight line-clamp-1 mb-1">{r.title}</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-white/80 text-[10px]">
                <Eye className="w-3 h-3" /> {fmt(r.viewCount)}
              </span>
              <span className="flex items-center gap-0.5 text-white/80 text-[10px]">
                <Heart className="w-3 h-3" /> {fmt(r.likeCount)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!hovered && (
        <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
          <Eye className="w-3 h-3 text-white/65" />
          <span className="text-[10px] text-white/65">{fmt(r.viewCount)}</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── SavedCollectionCard ──────────────────────────────────────────────────────

const PLACEHOLDER_IMGS = [
  'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=200&q=80',
  'https://images.unsplash.com/photo-1542367592-8849eb950fd8?w=200&q=80',
  'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&q=80',
  'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=200&q=80',
]

function SavedCollectionCard({ c }: { c: ProfileCollection }) {
  // Pad to 4 images with placeholders if needed
  const imgs = [
    ...c.previewImages,
    ...PLACEHOLDER_IMGS,
  ].slice(0, 4)

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ scale: 1.025, y: -4 }}
      className="group cursor-pointer rounded-2xl overflow-hidden"
      style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
    >
      <div className="grid grid-cols-2 aspect-square">
        {imgs.map((img, i) => (
          <div key={i} className="relative overflow-hidden">
            <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
        ))}
      </div>
      <div className="p-3 flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm" style={{ color: 'var(--cr-text-1)' }}>{c.name}</h4>
          <p className="text-xs mt-0.5" style={{ color: 'var(--cr-text-muted)' }}>{c.itemCount} items</p>
        </div>
        <ChevronRight className="w-4 h-4" style={{ color: 'var(--cr-text-muted)' }} />
      </div>
    </motion.div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        className="text-5xl mb-4 block"
      >
        {emoji}
      </motion.span>
      <p className="text-base font-semibold" style={{ color: 'var(--cr-text-2)' }}>{title}</p>
      <p className="text-sm mt-1 text-center max-w-xs" style={{ color: 'var(--cr-text-muted)' }}>{sub}</p>
    </motion.div>
  )
}

// ─── AvatarFallback — initials when no profileImage ───────────────────────────

function AvatarFallback({ name }: { name: string }) {
  const initials = (name ?? '').split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div
      className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-bold"
      style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}
    >
      {initials}
    </div>
  )
}

// ─── SettingsDrawer ───────────────────────────────────────────────────────────

function SettingsDrawer({ open, onClose, onEditProfile, onChangePassword }: { open: boolean; onClose: () => void; onEditProfile: () => void; onChangePassword: () => void }) {
  const { theme, toggleTheme } = useTheme()
  const [privacy, setPrivacy] = useState({ hideLikeCount: false, blockComments: false, privateAccount: false })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    fetch('/api/profile/settings')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setPrivacy(p => ({ ...p, hideLikeCount: d.hideLikeCount, blockComments: d.blockComments, privateAccount: d.privateAccount ?? false }))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [open, loaded])

  const savePrivacy = (key: 'hideLikeCount' | 'blockComments' | 'privateAccount', value: boolean) => {
    setPrivacy(p => ({ ...p, [key]: value }))
    fetch('/api/profile/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [key]: value }),
    }).catch(() => {})
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key="drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 z-[90] w-full max-w-sm overflow-y-auto"
            style={{ background: 'var(--cr-bg-card)', boxShadow: '-4px 0 48px rgba(0,0,0,0.35)' }}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--cr-text-1)', fontFamily: 'var(--font-heading)' }}>Settings</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/10 dark:hover:bg-white/10">
                <X className="w-5 h-5" style={{ color: 'var(--cr-text-2)' }} />
              </button>
            </div>

            <div className="p-5 space-y-6 pb-10">
              {/* Account */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--cr-text-muted)' }}>Account</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--cr-bg-surface)' }}>
                  {[
                    { icon: <Edit3 className="w-4 h-4" />, label: 'Edit Profile',    onClick: onEditProfile    },
                    { icon: <Key   className="w-4 h-4" />, label: 'Change Password', onClick: onChangePassword },
                  ].map((item, i, arr) => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left ${i < arr.length - 1 ? 'border-b' : ''}`}
                      style={{ borderColor: 'var(--cr-border)' }}
                    >
                      <span style={{ color: 'var(--cr-accent)' }}>{item.icon}</span>
                      <span className="text-sm font-medium flex-1" style={{ color: 'var(--cr-text-1)' }}>{item.label}</span>
                      <ChevronRight className="w-4 h-4" style={{ color: 'var(--cr-text-muted)' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--cr-text-muted)' }}>Privacy</p>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--cr-bg-surface)' }}>
                  {([
                    { key: 'hideLikeCount'  as const, label: 'Hide Like Count',  sub: "Others won't see like counts on your posts", icon: <EyeOff        className="w-4 h-4" /> },
                    { key: 'blockComments'  as const, label: 'Block Comments',   sub: 'Disable comments on your posts',             icon: <MessageCircle className="w-4 h-4" /> },
                    { key: 'privateAccount' as const, label: 'Private Account',  sub: 'Only approved followers can see your posts', icon: <Lock          className="w-4 h-4" /> },
                  ] as const).map((item, i, arr) => (
                    <div key={item.key} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--cr-border)' }}>
                      <div className="flex items-center gap-3">
                        <span style={{ color: 'var(--cr-text-2)' }}>{item.icon}</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--cr-text-1)' }}>{item.label}</p>
                          <p className="text-xs" style={{ color: 'var(--cr-text-muted)' }}>{item.sub}</p>
                        </div>
                      </div>
                      <Toggle
                        on={privacy[item.key]}
                        onToggle={() => savePrivacy(item.key, !privacy[item.key])}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Appearance */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--cr-text-muted)' }}>Appearance</p>
                <div className="flex items-center justify-between px-4 py-3.5 rounded-2xl" style={{ background: 'var(--cr-bg-surface)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{theme === 'dark' ? '🌙' : '☀️'}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--cr-text-1)' }}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
                      <p className="text-xs" style={{ color: 'var(--cr-text-muted)' }}>Toggle theme</p>
                    </div>
                  </div>
                  <Toggle on={theme === 'dark'} onToggle={toggleTheme} />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── ProfilePage (main export) ────────────────────────────────────────────────

interface LikedSavedRecipe {
  id: string; title: string; coverImage: string | null
  cookTime: number | null; prepTime: number | null
  likeCount: number; difficulty: string | null
}
interface LikedSavedReel {
  id: string; title: string; thumbnailUrl: string | null
  videoUrl: string; likeCount: number; duration: number | null; viewCount: number
}

export function ProfilePage({ user, stats, recipes, reels, collections }: ProfilePageProps) {
  const [activeTab,       setActiveTab]       = useState<ProfileTab>('Recipes')
  const [showSettings,    setShowSettings]    = useState(false)
  const [showEditProfile,     setShowEditProfile]     = useState(false)
  const [showChangePassword,  setShowChangePassword]  = useState(false)
  const [showAddModal,    setShowAddModal]    = useState(false)
  const [savedSet,        setSavedSet]        = useState<Set<string>>(new Set())
  const [isFollowing,     setIsFollowing]     = useState(false)
  const [socialModal,     setSocialModal]     = useState<SocialListType | null>(null)

  // ── Liked tab data ────────────────────────────────────────────────────────────
  const [likedRecipes, setLikedRecipes] = useState<LikedSavedRecipe[]>([])
  const [likedReels,   setLikedReels]   = useState<LikedSavedReel[]>([])
  const [likedLoaded,  setLikedLoaded]  = useState(false)
  const [likedLoading, setLikedLoading] = useState(false)

  // ── Saved tab data ────────────────────────────────────────────────────────────
  const [savedRecipes, setSavedRecipes] = useState<LikedSavedRecipe[]>([])
  const [savedReels,   setSavedReels]   = useState<LikedSavedReel[]>([])
  const [savedLoaded,  setSavedLoaded]  = useState(false)
  const [savedLoading, setSavedLoading] = useState(false)

  // ── Editable profile info ────────────────────────────────────────────────────
  const [profileName,     setProfileName]     = useState(user.name)
  const [profileUsername, setProfileUsername] = useState(user.username)
  const [profileBio,      setProfileBio]      = useState(user.bio)
  const [profileLevel,    setProfileLevel]    = useState(user.level)

  // ── Image upload state ───────────────────────────────────────────────────────
  const [avatarUrl,       setAvatarUrl]       = useState<string | null>(user.avatar)
  const [coverUrl,        setCoverUrl]        = useState<string | null>(user.backgroundPicture ?? null)
  const [cropModal,       setCropModal]       = useState<{ type: 'avatar' | 'cover'; file: File } | null>(null)
  const [toast,           setToast]           = useState<{ msg: string; ok: boolean } | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef  = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'avatar' | 'cover',
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const err = validateImageFile(file)
    if (err) { showToast(err, false); return }
    setCropModal({ type, file })
  }

  const router       = useRouter()
  const isOwnProfile = true

  const handleShare = useCallback(async () => {
    const username = profileUsername.replace(/^@/, '')
    const url = `${window.location.origin}/user/${username}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profileName} on CookReels`, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Profile link copied!', true)
      }
    } catch {
      // user cancelled share sheet — do nothing
    }
  }, [profileName, profileUsername]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sessionStorage.getItem('cr:open-settings') === '1') {
      sessionStorage.removeItem('cr:open-settings')
      setShowSettings(true)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'Liked' || likedLoaded || likedLoading) return
    setLikedLoading(true)
    fetch('/api/profile/liked')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setLikedRecipes(d.recipes); setLikedReels(d.reels) }
        setLikedLoaded(true)
      })
      .catch(() => setLikedLoaded(true))
      .finally(() => setLikedLoading(false))
  }, [activeTab, likedLoaded, likedLoading])

  useEffect(() => {
    if (activeTab !== 'Saved' || savedLoaded || savedLoading) return
    setSavedLoading(true)
    fetch('/api/profile/saved')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setSavedRecipes(d.recipes); setSavedReels(d.reels) }
        setSavedLoaded(true)
      })
      .catch(() => setSavedLoaded(true))
      .finally(() => setSavedLoading(false))
  }, [activeTab, savedLoaded, savedLoading])

  const toggleSave = (id: string) => {
    setSavedSet(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const firstName = profileName.split(' ')[0]

  return (
    <DashboardLayout username={firstName}>
      <div className="max-w-4xl mx-auto">

        {/* ── COVER + AVATAR ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {/* Cover banner — wrapped in a relative container so the edit button
               sits OUTSIDE overflow-hidden and never gets clipped or flickers */}
          <div className="relative z-10">
            <div
              className="w-full h-36 sm:h-52 rounded-2xl overflow-hidden"
              style={!coverUrl ? { background: 'linear-gradient(135deg, #1a1a1b 0%, #2B2B2D 25%, #3d2810 55%, rgba(245,197,24,0.55) 100%)' } : undefined}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
                  <span className="absolute top-4 right-8 text-5xl sm:text-7xl opacity-25">🍳</span>
                  <span className="absolute bottom-3 left-10 text-3xl sm:text-5xl opacity-20">🌶️</span>
                  <span className="absolute top-5 left-1/3 text-4xl sm:text-6xl opacity-15">🍜</span>
                </div>
              )}
            </div>

            {/* Cover edit button — always visible, outside overflow-hidden */}
            {isOwnProfile && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => coverInputRef.current?.click()}
                className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border"
                style={{
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(8px)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                }}
                title="Change cover photo"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit Cover</span>
              </motion.button>
            )}
          </div>

          {/* Avatar + action buttons */}
          <div className="relative z-20 flex items-end justify-between px-4 -mt-10 sm:-mt-14">
            <div className="relative shrink-0">
              {/* Glowing ring */}
              <div
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-full p-[3px] animate-pulse-glow-yellow"
                style={{ background: 'linear-gradient(135deg, #F5C518, #FF9F1C, #F5C518)' }}
              >
                <div className="w-full h-full rounded-full overflow-hidden" style={{ border: '3px solid var(--cr-bg-card)' }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    : <AvatarFallback name={user.name} />
                  }
                </div>
              </div>
              {/* Online dot */}
              {user.isOnline && (
                <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 bg-emerald-500 animate-green-pulse" style={{ borderColor: 'var(--cr-bg-card)' }} />
              )}
              {/* Camera button — own profile */}
              {isOwnProfile && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-0.5 -left-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 hover:scale-110 transition-transform shadow-lg"
                  style={{ background: 'var(--cr-accent)', borderColor: 'var(--cr-bg-card)', color: '#1A1A1A' }}
                  title="Change profile photo"
                >
                  <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>

            {/* Desktop action buttons */}
            <div className="hidden sm:flex items-center gap-2 pb-3">
              {isOwnProfile ? (
                <>
                  <motion.button
                    onClick={() => setShowAddModal(true)}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors"
                    style={{ borderColor: 'var(--cr-accent)', color: 'var(--cr-accent)', background: 'var(--cr-accent-soft)' }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Content
                  </motion.button>
                  <motion.button onClick={handleShare} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border transition-colors" style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' }}>
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button onClick={() => setIsFollowing(f => !f)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors" style={isFollowing ? { borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' } : { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}>
                    {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {isFollowing ? 'Following' : 'Follow'}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border" style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' }}>
                    <MessageCircle className="w-3.5 h-3.5" /> Message
                  </motion.button>
                </>
              )}
              <motion.button onClick={() => setShowSettings(true)} whileHover={{ scale: 1.08, rotate: 20 }} whileTap={{ scale: 0.95 }} className="w-10 h-10 rounded-full flex items-center justify-center border transition-all" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
                <Settings className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── PROFILE INFO ────────────────────────────────── */}
        <motion.div className="px-4 mt-3 sm:mt-4" {...fadeUp(0.1)}>
          {/* Name + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--cr-text-1)' }}>
              {profileName}
            </h1>
            {user.verified && (
              <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" style={{ color: 'var(--cr-accent)' }} />
            )}
            {user.topChef && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}>
                👑 Top Chef
              </span>
            )}
          </div>

          {/* Username */}
          <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--cr-text-muted)' }}>
            @{profileUsername}
          </p>

          {/* Bio */}
          {profileBio && (
            <p className="text-sm mt-2 leading-relaxed max-w-lg" style={{ color: 'var(--cr-text-2)' }}>
              {profileBio}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">
            {user.cuisineSpecialty && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--cr-text-muted)' }}>
                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                {user.cuisineSpecialty}
              </span>
            )}
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'var(--cr-accent-soft)', color: 'var(--cr-accent)' }}>
              {profileLevel}
            </span>
          </div>

          {/* Mobile action buttons */}
          <div className="flex sm:hidden gap-2 mt-4">
            {isOwnProfile ? (
              <>
                <motion.button
                  onClick={() => setShowAddModal(true)}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold border"
                  style={{ borderColor: 'var(--cr-accent)', color: 'var(--cr-accent)', background: 'var(--cr-accent-soft)' }}
                >
                  <Plus className="w-4 h-4" /> Add Content
                </motion.button>
                <motion.button onClick={handleShare} whileTap={{ scale: 0.97 }} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-sm font-semibold border" style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' }}>
                  <Share2 className="w-4 h-4" />
                </motion.button>
              </>
            ) : (
              <>
                <motion.button onClick={() => setIsFollowing(f => !f)} whileTap={{ scale: 0.97 }} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold" style={isFollowing ? { border: '1px solid var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' } : { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}>
                  {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isFollowing ? 'Following' : 'Follow'}
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold border" style={{ borderColor: 'var(--cr-border)', color: 'var(--cr-text-1)', background: 'var(--cr-bg-card)' }}>
                  <MessageCircle className="w-4 h-4" /> Message
                </motion.button>
              </>
            )}
            <motion.button onClick={() => setShowSettings(true)} whileTap={{ scale: 0.95 }} className="w-11 h-11 rounded-full flex items-center justify-center border" style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
              <Settings className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
            </motion.button>
          </div>
        </motion.div>

        {/* ── STATS ROW ────────────────────────────────────── */}
        <motion.div
          className="mx-4 mt-5 flex items-center justify-between py-4 px-2 sm:px-4 rounded-2xl"
          style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
          {...fadeUp(0.15)}
        >
          {[
            { label: 'Recipes',   value: stats.recipes,   type: null              },
            { label: 'Reels',     value: stats.reels,     type: null              },
            { label: 'Followers', value: stats.followers, type: 'followers' as SocialListType },
            { label: 'Following', value: stats.following, type: 'following' as SocialListType },
            { label: 'Friends',   value: stats.friends,   type: 'friends'  as SocialListType },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center">
              {s.type ? (
                <motion.button
                  whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setSocialModal(s.type)}
                  className="flex flex-col items-center outline-none"
                >
                  <AnimatedStat value={s.value} label={s.label} />
                </motion.button>
              ) : (
                <AnimatedStat value={s.value} label={s.label} />
              )}
              {i < arr.length - 1 && (
                <div className="h-7 w-px mx-0.5 sm:mx-1 shrink-0" style={{ background: 'var(--cr-border)' }} />
              )}
            </div>
          ))}
        </motion.div>

        {/* ── STICKY TAB NAVIGATION ────────────────────────── */}
        <div className="sticky top-0 z-20 mt-6 border-b" style={{ background: 'var(--cr-bg-surface)', borderColor: 'var(--cr-border)' }}>
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative flex items-center gap-1.5 px-4 sm:px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors"
                style={{ color: activeTab === tab ? 'var(--cr-accent)' : 'var(--cr-text-muted)' }}
              >
                {tab === 'Recipes' && <ChefHat className="w-3.5 h-3.5" />}
                {tab === 'Reels'   && <Film    className="w-3.5 h-3.5" />}
                {tab === 'Saved'   && <Bookmark className="w-3.5 h-3.5" />}
                {tab === 'Liked'   && <Heart   className="w-3.5 h-3.5" />}
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full"
                    style={{ background: 'var(--cr-accent)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB CONTENT ──────────────────────────────────── */}
        <div className="mt-5 px-4 pb-8">
          <AnimatePresence mode="wait">

            {/* RECIPES */}
            {activeTab === 'Recipes' && (
              <motion.div key="recipes" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: EASE }}>
                {recipes.length === 0 ? (
                  <EmptyState emoji="🍽️" title="No recipes yet" sub="Start sharing your cooking creations with the world" />
                ) : (
                  <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {recipes.map((r, i) => (
                      <RecipeCard key={r.id} r={r} idx={i} saved={savedSet.has(r.id)} onSave={() => toggleSave(r.id)} onClick={() => router.push(`/recipe/${r.id}`)} />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* REELS */}
            {activeTab === 'Reels' && (
              <motion.div key="reels" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: EASE }}>
                {reels.length === 0 ? (
                  <EmptyState emoji="🎬" title="No reels yet" sub="Post your first cooking reel to grow your audience" />
                ) : (
                  <motion.div variants={staggerContainer(0.03)} initial="hidden" animate="visible" className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                    {reels.map((r, i) => (
                      <ReelCard key={r.id} r={r} idx={i} onClick={() => router.push(`/reel/${r.id}`)} />
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* SAVED */}
            {activeTab === 'Saved' && (
              <motion.div key="saved" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: EASE }}>
                {savedLoading ? (
                  <div className="flex justify-center py-20">
                    <div className="w-6 h-6 rounded-full border-2 border-[#F5C518] border-t-transparent animate-spin" />
                  </div>
                ) : savedRecipes.length === 0 && savedReels.length === 0 ? (
                  <EmptyState emoji="🔖" title="No saved posts yet" sub="Save recipes and reels to find them easily here" />
                ) : (
                  <div className="space-y-6">
                    {savedRecipes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--cr-text-muted)' }}>Recipes</p>
                        <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                          {savedRecipes.map((r, i) => (
                            <RecipeCard key={r.id} r={r} idx={i} saved={savedSet.has(r.id)} onSave={() => toggleSave(r.id)} onClick={() => router.push(`/recipe/${r.id}`)} />
                          ))}
                        </motion.div>
                      </div>
                    )}
                    {savedReels.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--cr-text-muted)' }}>Reels</p>
                        <motion.div variants={staggerContainer(0.03)} initial="hidden" animate="visible" className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                          {savedReels.map((r, i) => (
                            <ReelCard key={r.id} r={{ ...r, description: null }} idx={i} onClick={() => router.push(`/reel/${r.id}`)} />
                          ))}
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* LIKED */}
            {activeTab === 'Liked' && (
              <motion.div key="liked" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.28 }}>
                {likedLoading ? (
                  <div className="flex justify-center py-20">
                    <div className="w-6 h-6 rounded-full border-2 border-[#F5C518] border-t-transparent animate-spin" />
                  </div>
                ) : likedRecipes.length === 0 && likedReels.length === 0 ? (
                  <EmptyState emoji="❤️" title="No liked posts yet" sub="Recipes and reels you like will appear here" />
                ) : (
                  <div className="space-y-6">
                    {likedRecipes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--cr-text-muted)' }}>Recipes</p>
                        <motion.div variants={staggerContainer(0.04)} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                          {likedRecipes.map((r, i) => (
                            <RecipeCard key={r.id} r={r} idx={i} saved={savedSet.has(r.id)} onSave={() => toggleSave(r.id)} onClick={() => router.push(`/recipe/${r.id}`)} />
                          ))}
                        </motion.div>
                      </div>
                    )}
                    {likedReels.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--cr-text-muted)' }}>Reels</p>
                        <motion.div variants={staggerContainer(0.03)} initial="hidden" animate="visible" className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                          {likedReels.map((r, i) => (
                            <ReelCard key={r.id} r={{ ...r, description: null }} idx={i} onClick={() => router.push(`/reel/${r.id}`)} />
                          ))}
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Settings drawer */}
      <SettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onEditProfile={() => { setShowSettings(false); setShowEditProfile(true) }}
        onChangePassword={() => { setShowSettings(false); setShowChangePassword(true) }}
      />

      {/* Change password modal */}
      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => showToast('Password updated!', true)}
      />

      {/* Edit profile modal */}
      <EditProfileModal
        open={showEditProfile}
        userId={user.id}
        initialName={profileName}
        initialBio={profileBio}
        initialLevel={profileLevel}
        initialCoverUrl={coverUrl}
        initialAvatarUrl={avatarUrl}
        onClose={() => setShowEditProfile(false)}
        onSave={({ name, bio, level }) => {
          setProfileName(name)
          setProfileBio(bio)
          setProfileLevel(level)
          showToast('Profile updated!', true)
        }}
        onCoverUpdate={(url) => {
          setCoverUrl(url)
          showToast('Banner updated!', true)
        }}
        onAvatarUpdate={(url) => {
          setAvatarUrl(url)
          showToast('Profile photo updated!', true)
          window.dispatchEvent(new CustomEvent('cr:avatar-updated', { detail: { url } }))
        }}
      />

      {/* Add content modal */}
      <AddContentModal open={showAddModal} onClose={() => setShowAddModal(false)} userId={user.id} />

      {/* Social list modal */}
      <SocialListModal
        isOpen={socialModal !== null}
        onClose={() => setSocialModal(null)}
        title={socialModal === 'followers' ? 'Followers' : socialModal === 'following' ? 'Following' : 'Friends'}
        username={profileUsername}
        listType={socialModal ?? 'followers'}
        currentUserId={user.id}
      />

      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'avatar')}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'cover')}
      />

      {/* Image crop modal */}
      <ImageCropModal
        open={cropModal !== null}
        file={cropModal?.file ?? null}
        type={cropModal?.type ?? 'avatar'}
        userId={user.id}
        onClose={() => setCropModal(null)}
        onSuccess={(url) => {
          if (cropModal?.type === 'avatar') {
            setAvatarUrl(url)
            showToast('Profile photo updated!', true)
          } else {
            setCoverUrl(url)
            showToast('Cover photo updated!', true)
          }
          setCropModal(null)
        }}
      />

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="profile-toast"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl flex items-center gap-2"
            style={{
              background: toast.ok ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#ef4444',
              color: '#fff',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            }}
          >
            {toast.ok ? '✓' : '✕'} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  )
}
