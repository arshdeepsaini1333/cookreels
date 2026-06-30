'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link2, Check, Search, Send, Clock, Users } from 'lucide-react'

// ─── Platform config ──────────────────────────────────────────────────────────

const platforms = (url: string, title: string) => [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    href: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(`${t}\n${u}`)}`,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    color: '#000000',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    href: (u: string, t: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    color: '#2AABEE',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    href: (u: string, t: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    id: 'email',
    label: 'Email',
    color: '#6B7280',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    href: (u: string, t: string) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(`Check this out on CookReels:\n${u}`)}`,
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface SharePerson {
  id: string
  name: string
  username: string
  avatar: string | null
  isOnline?: boolean
  lastMessageAt?: string | null
  hasConversation: boolean
}

export interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  url: string
  currentUserId?: string
  contentType?: 'reel' | 'recipe'
  contentId?: string
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ src, name, isOnline }: { src?: string | null; name: string; isOnline?: boolean }) {
  const initials = (name ?? '').split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div className="relative shrink-0">
      <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#F5C518]/20">
        {src && !/googleusercontent\.com/i.test(src)
          ? <img src={src} alt={name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[11px] font-bold"
                 style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}>
              {initials}
            </div>
        }
      </div>
      {isOnline !== undefined && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--cr-bg-card)]"
          style={{ background: isOnline ? '#22c55e' : 'var(--cr-border)' }} />
      )}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10002] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold"
      style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A', whiteSpace: 'nowrap' }}
    >
      <Check className="w-4 h-4 shrink-0" />
      {message}
    </motion.div>,
    document.body
  )
}

// ─── PersonRow ────────────────────────────────────────────────────────────────

function PersonRow({
  person, isSelected, isSent, onToggle,
}: {
  person: SharePerson
  isSelected: boolean
  isSent: boolean
  onToggle: () => void
}) {
  return (
    <motion.button
      layout
      onClick={() => !isSent && onToggle()}
      disabled={isSent}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors"
      style={{
        background: isSelected ? 'rgba(245,197,24,0.10)' : 'transparent',
        border:     isSelected ? '1px solid rgba(245,197,24,0.30)' : '1px solid transparent',
        cursor:     isSent ? 'default' : 'pointer',
      }}
    >
      <Avatar src={person.avatar} name={person.name} isOnline={person.isOnline} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--cr-text-primary)' }}>
          {person.name}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--cr-text-muted)' }}>
          @{person.username}
        </p>
      </div>
      {isSent ? (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0"
          style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
        >
          <Check className="w-3 h-3" /> Sent
        </motion.span>
      ) : (
        <motion.div
          animate={isSelected ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{
            borderColor: isSelected ? '#F5C518' : 'var(--cr-border)',
            background:  isSelected ? '#F5C518' : 'transparent',
          }}
        >
          {isSelected && <Check className="w-3 h-3" style={{ color: '#1A1A1A' }} />}
        </motion.div>
      )}
    </motion.button>
  )
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

export function ShareModal({
  isOpen, onClose, title, url, currentUserId, contentType, contentId,
}: ShareModalProps) {
  const [copied,    setCopied]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [people,    setPeople]    = useState<SharePerson[]>([])
  const [loading,   setLoading]   = useState(false)
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [sending,   setSending]   = useState(false)
  const [sent,      setSent]      = useState<Set<string>>(new Set())
  const [toast,     setToast]     = useState<string | null>(null)
  const [mounted,   setMounted]   = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setSelected(new Set())
      setSent(new Set())
      setCopied(false)
      setToast(null)
    }
  }, [isOpen])

  const loadPeople = useCallback(async (query: string) => {
    if (!currentUserId) return
    setLoading(true)
    try {
      // Fetch recent conversations + friends in parallel
      const [convRes, friendRes] = await Promise.all([
        fetch('/api/messages/conversations'),
        fetch(`/api/social/friends?limit=40${query ? `&search=${encodeURIComponent(query)}` : ''}`),
      ])
      const convData   = convRes.ok   ? await convRes.json()   : { conversations: [] }
      const friendData = friendRes.ok ? await friendRes.json() : { friends: [] }

      // Build recent chat people (have an existing conversation, ordered by lastMessageAt)
      const recentConvs = (convData.conversations ?? []) as {
        id: string | null; user: { id: string; name: string; username: string; avatar: string | null; isOnline: boolean }; lastMessageAt: string | null
      }[]
      const recentIds = new Set<string>()
      const recent: SharePerson[] = recentConvs
        .filter(c => c.id !== null) // only actual conversations
        .map(c => {
          recentIds.add(c.user.id)
          return {
            id:              c.user.id,
            name:            c.user.name,
            username:        c.user.username,
            avatar:          c.user.avatar,
            isOnline:        c.user.isOnline,
            lastMessageAt:   c.lastMessageAt,
            hasConversation: true,
          }
        })

      // Friends without an existing conversation
      const rawFriends = (friendData.friends ?? []) as {
        id: string; firstName: string; lastName: string; username: string; profileImage: string | null
      }[]
      const fresh: SharePerson[] = rawFriends
        .filter(f => !recentIds.has(f.id))
        .map(f => ({
          id:              f.id,
          name:            `${f.firstName} ${f.lastName}`,
          username:        f.username,
          avatar:          f.profileImage,
          isOnline:        undefined,
          lastMessageAt:   null,
          hasConversation: false,
        }))

      // If search query filter recent chats by name/username
      const filteredRecent = query
        ? recent.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.username.toLowerCase().includes(query.toLowerCase())
          )
        : recent

      setPeople([...filteredRecent, ...fresh])
    } catch { /* ignore */ }
    setLoading(false)
  }, [currentUserId])

  // Debounced search
  useEffect(() => {
    if (!isOpen || !currentUserId) return
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => loadPeople(search), 300)
    return () => { if (searchRef.current) clearTimeout(searchRef.current) }
  }, [isOpen, search, currentUserId, loadPeople])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const togglePerson = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const sendToSelected = async () => {
    if (!selected.size || sending) return
    setSending(true)
    const ids       = Array.from(selected)
    const justSent  = new Set<string>()
    const isRich    = Boolean(contentType && contentId)

    await Promise.allSettled(ids.map(async (personId) => {
      try {
        // Get or create conversation
        const convRes = await fetch('/api/messages/conversations', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: personId }),
        })
        const { conversationId } = await convRes.json()
        if (!conversationId) return

        // Build message payload
        const payload = isRich
          ? {
              conversationId,
              content:        '',
              messageType:    contentType === 'reel' ? 'REEL_SHARE' : 'RECIPE_SHARE',
              sharedReelId:   contentType === 'reel'    ? contentId : undefined,
              sharedRecipeId: contentType === 'recipe'  ? contentId : undefined,
            }
          : {
              conversationId,
              content: `Check out "${title}" on CookReels 🍳\n${url}`,
            }

        const sendRes = await fetch('/api/messages/send', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        if (sendRes.ok) justSent.add(personId)
      } catch { /* ignore */ }
    }))

    setSent(prev => new Set([...prev, ...justSent]))
    setSelected(new Set())
    setSending(false)

    if (justSent.size > 0) {
      const label = contentType === 'reel' ? 'Reel' : contentType === 'recipe' ? 'Recipe' : 'Link'
      setToast(`✓ ${label} shared to ${justSent.size} ${justSent.size === 1 ? 'person' : 'people'}`)
      // Close modal after brief delay so toast is visible
      setTimeout(onClose, 1500)
    }
  }

  if (!mounted) return null

  // Split people into recent vs fresh for section headers
  const recentPeople = people.filter(p => p.hasConversation)
  const freshPeople  = people.filter(p => !p.hasConversation)
  const pt = platforms(url, title)

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="share-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              style={{ zIndex: 10000 }}
            />

            {/* Sheet */}
            <motion.div
              key="share-sheet"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-[480px] md:bottom-auto md:top-1/2 md:-translate-y-1/2 rounded-t-3xl md:rounded-3xl overflow-hidden"
              style={{ zIndex: 10001, background: 'var(--cr-bg-card)', maxHeight: '92vh' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-2.5 pb-1 md:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--cr-border)' }} />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--cr-border)' }}>
                <span className="text-base font-bold" style={{ color: 'var(--cr-text-primary)', fontFamily: 'var(--font-heading)' }}>
                  Share
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
                  style={{ background: 'var(--cr-bg-surface)', color: 'var(--cr-text-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 120px)' }}>
                {/* Copy link */}
                <div className="px-4 pt-4 pb-2">
                  <div
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer select-none transition-opacity hover:opacity-80"
                    style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}
                    onClick={copyLink}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                         style={{ background: copied ? '#F5C518' : 'var(--cr-bg-card)' }}>
                      {copied
                        ? <Check className="w-4 h-4" style={{ color: '#1A1A1A' }} />
                        : <Link2 className="w-4 h-4" style={{ color: 'var(--cr-text-muted)' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--cr-text-primary)' }}>
                        {copied ? 'Link copied!' : 'Copy link'}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--cr-text-muted)' }}>{url}</p>
                    </div>
                  </div>
                </div>

                {/* Platform buttons */}
                <div className="px-4 pb-4">
                  <p className="text-[11px] font-semibold mb-3 uppercase tracking-widest" style={{ color: 'var(--cr-text-muted)' }}>
                    Share to
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {pt.map(p => (
                      <a
                        key={p.id}
                        href={p.href(url, title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-1.5 shrink-0"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: p.color, color: '#fff' }}>
                          {p.icon}
                        </div>
                        <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--cr-text-muted)' }}>
                          {p.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* In-app friend sharing */}
                {currentUserId && (
                  <div style={{ borderTop: '1px solid var(--cr-border)' }}>
                    {/* Search */}
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5"
                           style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}>
                        <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--cr-text-muted)' }} />
                        <input
                          type="text"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          placeholder="Search people…"
                          className="flex-1 bg-transparent text-sm outline-none"
                          style={{ color: 'var(--cr-text-primary)' }}
                          autoComplete="off"
                        />
                        {search && (
                          <button onClick={() => setSearch('')} className="shrink-0 opacity-50 hover:opacity-100">
                            <X className="w-3.5 h-3.5" style={{ color: 'var(--cr-text-muted)' }} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* People list */}
                    <div className="px-4 pb-2" style={{ maxHeight: 340, overflowY: 'auto' }}>
                      {loading ? (
                        <div className="space-y-2 py-1">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 py-1.5">
                              <div className="w-10 h-10 rounded-full animate-pulse shrink-0" style={{ background: 'var(--cr-border)' }} />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 rounded-full w-28 animate-pulse" style={{ background: 'var(--cr-border)' }} />
                                <div className="h-2.5 rounded-full w-16 animate-pulse" style={{ background: 'var(--cr-border)' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : people.length === 0 ? (
                        <p className="text-sm py-8 text-center" style={{ color: 'var(--cr-text-muted)' }}>
                          {search ? 'No people found' : 'No friends yet'}
                        </p>
                      ) : (
                        <div className="space-y-0.5">
                          {/* Recent chats section */}
                          {recentPeople.length > 0 && (
                            <>
                              {!search && (
                                <div className="flex items-center gap-1.5 px-2 py-2">
                                  <Clock className="w-3 h-3 shrink-0" style={{ color: 'var(--cr-text-muted)' }} />
                                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cr-text-muted)' }}>
                                    Recent
                                  </span>
                                </div>
                              )}
                              {recentPeople.map(p => (
                                <PersonRow
                                  key={p.id}
                                  person={p}
                                  isSelected={selected.has(p.id)}
                                  isSent={sent.has(p.id)}
                                  onToggle={() => togglePerson(p.id)}
                                />
                              ))}
                            </>
                          )}

                          {/* Fresh friends section */}
                          {freshPeople.length > 0 && (
                            <>
                              {!search && recentPeople.length > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-2 mt-1">
                                  <Users className="w-3 h-3 shrink-0" style={{ color: 'var(--cr-text-muted)' }} />
                                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cr-text-muted)' }}>
                                    Friends
                                  </span>
                                </div>
                              )}
                              {freshPeople.map(p => (
                                <PersonRow
                                  key={p.id}
                                  person={p}
                                  isSelected={selected.has(p.id)}
                                  isSent={sent.has(p.id)}
                                  onToggle={() => togglePerson(p.id)}
                                />
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Sticky Send button */}
                    <AnimatePresence>
                      {selected.size > 0 && (
                        <motion.div
                          key="send-btn"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0  }}
                          exit={{    opacity: 0, y: 12 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="px-4 pb-6 pt-3 sticky bottom-0"
                          style={{ background: 'var(--cr-bg-card)', borderTop: '1px solid var(--cr-border)' }}
                        >
                          <button
                            onClick={sendToSelected}
                            disabled={sending}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-opacity"
                            style={{
                              background: 'linear-gradient(135deg,#F5C518,#FFB800)',
                              color:      '#1A1A1A',
                              opacity:    sending ? 0.7 : 1,
                            }}
                          >
                            <Send className="w-4 h-4" />
                            {sending
                              ? 'Sending…'
                              : `Send${selected.size > 1 ? ` (${selected.size})` : ''}`}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {selected.size === 0 && <div className="pb-6" />}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {toast && <Toast key="share-toast" message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </>,
    document.body
  )
}
