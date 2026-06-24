'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Send, ArrowLeft, MoreVertical,
  MessageCircle, Smile, ImageIcon, Check, CheckCheck,
  ChefHat, X, Loader2, Trash2, Ban,
} from 'lucide-react'
import { uploadToS3 } from '@/lib/uploadTos3'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConvUser {
  id: string
  name: string
  username: string
  avatar: string | null
  isOnline: boolean
}

interface LastMessage {
  content: string
  senderId: string
  status: 'SENT' | 'DELIVERED' | 'READ'
  createdAt: string
}

interface Conversation {
  id: string | null
  user: ConvUser
  lastMessage: LastMessage | null
  unreadCount: number
  lastMessageAt: string | null
}

interface MsgSender {
  id: string
  firstName: string
  lastName: string
  profileImage: string | null
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  imageUrl: string | null
  status: 'SENT' | 'DELIVERED' | 'READ'
  deletedForEveryone: boolean
  deletedForUserIds: string[]
  createdAt: string
  sender: MsgSender
}

interface CtxMenu {
  messageId: string
  isMine: boolean
  x: number
  y: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const POLL_INTERVAL = 3000

const EMOJIS = [
  '😊','😂','❤️','👍','🔥','✨','🎉','😍','🥰','👏',
  '😄','🙏','💯','😭','🤣','😅','🥹','🫶','💪','🤩',
  '🍕','🍔','🌮','🍜','🍣','🥗','🍳','🥘','🍰','🎂',
  '🍩','🍪','🍫','☕','🧁','🥐','🫕','🥙','🌯','🥚',
  '🧀','🥩','🥦','🧅','🧄','🫑','🥕','🍅','🥑','🍓',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTimeShort(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(diff / 3_600_000)
  if (hrs  < 24) return `${hrs}h`
  const days = Math.floor(diff / 86_400_000)
  if (days < 7)  return `${days}d`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatTimeFull(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

function groupByDate(messages: Message[]): { key: string; messages: Message[] }[] {
  const map: Record<string, Message[]> = {}
  for (const m of messages) {
    const key = new Date(m.createdAt).toDateString()
    ;(map[key] ??= []).push(m)
  }
  return Object.entries(map).map(([key, messages]) => ({ key, messages }))
}

function initials(name: string | null | undefined) {
  return (name ?? '').split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

function Avatar({
  name, avatar, isOnline, size = 'md',
}: {
  name: string; avatar: string | null; isOnline?: boolean; size?: AvatarSize
}) {
  const ring = { xs: 'w-6 h-6', sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-13 h-13' }[size]
  const dot  = { xs: 'w-1.5 h-1.5 bottom-0 right-0', sm: 'w-2 h-2 bottom-0 right-0', md: 'w-2.5 h-2.5 bottom-0 right-0', lg: 'w-3 h-3 bottom-0.5 right-0.5' }[size]
  const text = { xs: 'text-[9px]', sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' }[size]

  return (
    <div className="relative shrink-0">
      <div className={`${ring} rounded-full overflow-hidden ring-2 ring-[#F5C518]/25`}>
        {avatar && !/googleusercontent\.com/i.test(avatar) ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center font-bold ${text}`}
            style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}>
            {initials(name)}
          </div>
        )}
      </div>
      {isOnline !== undefined && (
        <span className={`absolute ${dot} rounded-full ring-2 ring-[var(--cr-bg-card)]`}
          style={{ background: isOnline ? '#22c55e' : 'var(--cr-border)' }} />
      )}
    </div>
  )
}

// ── Skeleton loaders ───────────────────────────────────────────────────────────

function ConvSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="w-10 h-10 rounded-full shrink-0 animate-pulse" style={{ background: 'var(--cr-border)' }} />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 w-28 rounded-full animate-pulse" style={{ background: 'var(--cr-border)' }} />
        <div className="h-2.5 w-36 rounded-full animate-pulse" style={{ background: 'var(--cr-border)' }} />
      </div>
    </div>
  )
}

function MsgSkeleton() {
  const rows = [false, true, false, false, true, false, true]
  return (
    <div className="flex flex-col gap-3 p-4">
      {rows.map((mine, i) => (
        <div key={i} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
          {!mine && <div className="w-6 h-6 rounded-full shrink-0 animate-pulse" style={{ background: 'var(--cr-border)' }} />}
          <div className="h-9 rounded-2xl animate-pulse"
            style={{ background: 'var(--cr-border)', width: `${Math.floor(Math.random() * 80) + 80}px` }} />
        </div>
      ))}
    </div>
  )
}

// ── ConversationItem ───────────────────────────────────────────────────────────

function ConversationItem({
  conv, isActive, currentUserId, onClick,
}: {
  conv: Conversation; isActive: boolean; currentUserId: string; onClick: () => void
}) {
  const preview = conv.lastMessage
    ? (conv.lastMessage.senderId === currentUserId ? 'You: ' : '') +
      (conv.lastMessage.content || '📷 Photo')
    : 'Start a conversation'

  return (
    <motion.button layout onClick={onClick} whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors"
      style={{ background: isActive ? 'rgba(245,197,24,0.10)' : 'transparent', borderLeft: `3px solid ${isActive ? '#F5C518' : 'transparent'}` }}
    >
      <Avatar name={conv.user.name} avatar={conv.user.avatar} isOnline={conv.user.isOnline} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm truncate"
            style={{ fontWeight: conv.unreadCount > 0 ? 700 : 600, color: isActive ? '#F5C518' : 'var(--cr-text-1)' }}>
            {conv.user.name}
          </span>
          {conv.lastMessageAt && (
            <span className="text-[10px] shrink-0" style={{ color: 'var(--cr-text-muted)' }}>
              {formatTimeShort(conv.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-xs truncate"
            style={{ color: 'var(--cr-text-muted)', fontWeight: conv.unreadCount > 0 ? 600 : 400 }}>
            {preview}
          </span>
          {conv.unreadCount > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: '#F5C518', color: '#1A1A1A' }}>
              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

// ── MessageBubble ──────────────────────────────────────────────────────────────

function MessageBubble({
  message, isMine, showAvatar, isDeleting, onContextMenu,
}: {
  message: Message
  isMine: boolean
  showAvatar: boolean
  isDeleting: boolean
  onContextMenu: (messageId: string, isMine: boolean, x: number, y: number) => void
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchPos       = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchPos.current = { x: t.clientX, y: t.clientY }
    longPressTimer.current = setTimeout(() => {
      onContextMenu(message.id, isMine, touchPos.current.x, touchPos.current.y)
    }, 500)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  // Deleted-for-everyone placeholder
  if (message.deletedForEveryone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
      >
        <div className="w-6 shrink-0" />
        <div className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
          <div className="px-3.5 py-2 flex items-center gap-1.5 italic text-xs"
            style={{ color: 'var(--cr-text-muted)', border: '1px dashed var(--cr-border)', borderRadius: '14px' }}>
            <Ban className="w-3 h-3 shrink-0" />
            This message was deleted
          </div>
          <span className="text-[10px] px-1" style={{ color: 'var(--cr-text-muted)' }}>
            {formatTimeFull(message.createdAt)}
          </span>
        </div>
      </motion.div>
    )
  }

  const hasImage = Boolean(message.imageUrl)
  const hasText  = Boolean(message.content)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: isDeleting ? 0.4 : 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: EASE }}
      className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
      onContextMenu={e => { e.preventDefault(); onContextMenu(message.id, isMine, e.clientX, e.clientY) }}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      {/* Received avatar slot */}
      <div className="w-6 shrink-0 self-end mb-1">
        {!isMine && showAvatar && (
          <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-[#F5C518]/20">
            {message.sender.profileImage && !/googleusercontent\.com/i.test(message.sender.profileImage) ? (
              <img src={message.sender.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A' }}>
                {message.sender.firstName[0]}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`max-w-[65%] sm:max-w-[55%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
        <div className="overflow-hidden" style={
          isMine
            ? { background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A', borderRadius: '18px 18px 4px 18px' }
            : { background: 'var(--cr-bg-card)', color: 'var(--cr-text-1)', border: '1px solid var(--cr-border)', borderRadius: '18px 18px 18px 4px' }
        }>
          {hasImage && (
            <img src={message.imageUrl!} alt="attachment"
              className="block w-full max-w-[260px] object-cover"
              style={{ borderRadius: hasText ? '0' : 'inherit' }} />
          )}
          {hasText && (
            <p className="px-3.5 py-2 text-sm leading-relaxed break-words"
              style={{ fontWeight: isMine ? 500 : 400 }}>
              {message.content}
            </p>
          )}
        </div>

        {/* Timestamp + read receipt */}
        <div className={`flex items-center gap-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px]" style={{ color: 'var(--cr-text-muted)' }}>
            {formatTimeFull(message.createdAt)}
          </span>
          {isMine && (
            <span style={{ color: message.status === 'READ' ? '#22c55e' : 'var(--cr-text-muted)' }}>
              {message.status === 'READ' ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── MessageContextMenu ─────────────────────────────────────────────────────────

function MessageContextMenu({
  ctx,
  onDeleteForMe,
  onDeleteForEveryone,
  onClose,
}: {
  ctx: CtxMenu
  onDeleteForMe: () => void
  onDeleteForEveryone: () => void
  onClose: () => void
}) {
  const ref    = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: ctx.x, y: ctx.y })

  useEffect(() => {
    // Clamp to viewport
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({
      x: Math.min(ctx.x, window.innerWidth  - width  - 8),
      y: Math.min(ctx.y, window.innerHeight - height - 8),
    })
  }, [ctx.x, ctx.y])

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[9999] rounded-2xl shadow-xl overflow-hidden"
      style={{
        left:       pos.x,
        top:        pos.y,
        background: 'var(--cr-bg-card)',
        border:     '1px solid var(--cr-border)',
        minWidth:   '180px',
      }}
    >
      <button
        onClick={onDeleteForMe}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left transition-colors hover:bg-[var(--cr-bg-surface)]"
        style={{ color: 'var(--cr-text-1)' }}
      >
        <Trash2 className="w-4 h-4" style={{ color: 'var(--cr-text-muted)' }} />
        Delete for me
      </button>
      {ctx.isMine && (
        <button
          onClick={onDeleteForEveryone}
          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left transition-colors hover:bg-[rgba(239,68,68,0.08)] border-t"
          style={{ color: '#ef4444', borderColor: 'var(--cr-border)' }}
        >
          <Trash2 className="w-4 h-4" />
          Delete for everyone
        </button>
      )}
    </motion.div>
  )
}

// ── HeaderMenu ─────────────────────────────────────────────────────────────────

function HeaderMenu({
  onDeleteChat,
  isDeletingChat,
  onClose,
}: {
  onDeleteChat: () => void
  isDeletingChat: boolean
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute right-0 top-full mt-1 rounded-2xl shadow-xl overflow-hidden z-50"
      style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', minWidth: '160px' }}
    >
      <button
        onClick={onDeleteChat}
        disabled={isDeletingChat}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-left transition-colors hover:bg-[rgba(239,68,68,0.08)] disabled:opacity-50"
        style={{ color: '#ef4444' }}
      >
        {isDeletingChat
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Trash2  className="w-4 h-4" />
        }
        Delete chat
      </button>
    </motion.div>
  )
}

// ── EmojiPicker ────────────────────────────────────────────────────────────────

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15, ease: EASE }}
      className="absolute bottom-full left-0 mb-2 p-2 rounded-2xl shadow-xl z-50"
      style={{ background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)', width: '264px' }}
    >
      <div className="grid grid-cols-10 gap-0.5">
        {EMOJIS.map(emoji => (
          <button key={emoji} onClick={() => onSelect(emoji)}
            className="w-6 h-6 flex items-center justify-center text-base rounded-lg hover:bg-[rgba(245,197,24,0.15)] transition-colors">
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ── EmptyChatState ─────────────────────────────────────────────────────────────

function EmptyChatState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex-1 flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
        style={{ background: 'linear-gradient(135deg,rgba(245,197,24,0.15),rgba(255,184,0,0.06))' }}>
        <MessageCircle className="w-11 h-11" style={{ color: '#F5C518' }} />
      </div>
      <h3 className="text-xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--cr-text-1)' }}>
        Your messages
      </h3>
      <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--cr-text-muted)' }}>
        Select a conversation from the left to start messaging your fellow chefs
      </p>
      <div className="flex gap-2 mt-8">
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-2 h-2 rounded-full"
            style={{ background: '#F5C518', opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.6, delay: i * 0.3, repeat: Infinity }} />
        ))}
      </div>
    </motion.div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  currentUserId: string
  currentUsername: string
}

export function MessagesPage({ currentUserId, currentUsername }: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [conversations,    setConversations]    = useState<Conversation[]>([])
  const [activeConv,       setActiveConv]       = useState<Conversation | null>(null)
  const [messages,         setMessages]         = useState<Message[]>([])
  const [searchQuery,      setSearchQuery]      = useState('')
  const [inputValue,       setInputValue]       = useState('')
  const [isMobileChat,     setIsMobileChat]     = useState(false)
  const [loadingConvs,     setLoadingConvs]     = useState(true)
  const [loadingMsgs,      setLoadingMsgs]      = useState(false)
  const [isSending,        setIsSending]        = useState(false)
  const [showEmoji,        setShowEmoji]        = useState(false)
  const [imageFile,        setImageFile]        = useState<File | null>(null)
  const [imagePreview,     setImagePreview]     = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [contextMenu,      setContextMenu]      = useState<CtxMenu | null>(null)
  const [deletingMsgId,    setDeletingMsgId]    = useState<string | null>(null)
  const [showHeaderMenu,   setShowHeaderMenu]   = useState(false)
  const [isDeletingChat,   setIsDeletingChat]   = useState(false)

  const endRef      = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const pollingRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/conversations')
      if (!res.ok) {
        console.error('[MessagesPage] conversations API error', res.status)
        return
      }
      const data = await res.json()
      setConversations(data.conversations ?? [])
    } catch (err) {
      console.error('[MessagesPage] conversations fetch failed', err)
    }
  }, [])

  useEffect(() => {
    loadConversations().finally(() => setLoadingConvs(false))
  }, [loadConversations])

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true)
    try {
      const res = await fetch(`/api/messages/${convId}`)
      if (!res.ok) return
      const { messages } = await res.json()
      setMessages(messages ?? [])
    } catch { /* ignore */ }
    finally { setLoadingMsgs(false) }
  }, [])

  // Poll active conversation
  useEffect(() => {
    if (!activeConv?.id) return
    if (pollingRef.current) clearInterval(pollingRef.current)

    const convId = activeConv.id
    pollingRef.current = setInterval(async () => {
      try {
        const [msgRes, convRes] = await Promise.all([
          fetch(`/api/messages/${convId}`),
          fetch('/api/messages/conversations'),
        ])
        if (msgRes.ok)  { const d = await msgRes.json();  setMessages(d.messages ?? []) }
        if (convRes.ok) { const d = await convRes.json(); setConversations(d.conversations ?? []) }
      } catch { /* ignore */ }
    }, POLL_INTERVAL)

    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [activeConv?.id])

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Close context menu on scroll
  useEffect(() => {
    if (contextMenu) {
      const handler = () => setContextMenu(null)
      window.addEventListener('scroll', handler, true)
      return () => window.removeEventListener('scroll', handler, true)
    }
  }, [contextMenu])

  // ── Image helpers ──────────────────────────────────────────────────────────

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const clearImage = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
  }, [imagePreview])

  // ── Actions ────────────────────────────────────────────────────────────────

  const selectConv = useCallback(async (conv: Conversation) => {
    setIsMobileChat(true)
    setShowEmoji(false)
    setContextMenu(null)
    setShowHeaderMenu(false)

    let resolved = conv

    if (!conv.id) {
      try {
        const res = await fetch('/api/messages/conversations', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: conv.user.id }),
        })
        if (!res.ok) return
        const { conversationId } = await res.json()
        resolved = { ...conv, id: conversationId }
        setConversations(prev => prev.map(c => c.user.id === conv.user.id ? resolved : c))
      } catch { return }
    }

    setActiveConv(resolved)
    if (resolved.id) {
      await loadMessages(resolved.id)
      fetch(`/api/messages/${resolved.id}/read`, { method: 'PATCH' }).catch(() => {})
    }
    setConversations(prev =>
      prev.map(c => c.user.id === resolved.user.id ? { ...c, unreadCount: 0 } : c)
    )
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [loadMessages])

  const sendMessage = useCallback(async () => {
    const hasText  = Boolean(inputValue.trim())
    const hasImage = Boolean(imageFile)
    if ((!hasText && !hasImage) || !activeConv?.id || isSending) return

    const content = inputValue.trim()
    setInputValue('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setIsSending(true)

    let uploadedImageUrl: string | null = null
    if (imageFile) {
      setIsUploadingImage(true)
      const fileToUpload = imageFile
      clearImage()
      try {
        uploadedImageUrl = await uploadToS3(fileToUpload, 'messages')
      } catch {
        setIsSending(false)
        setIsUploadingImage(false)
        return
      }
      setIsUploadingImage(false)
    }

    const tempId = `opt-${Date.now()}`
    const optimistic: Message = {
      id:                 tempId,
      conversationId:     activeConv.id!,
      senderId:           currentUserId,
      content,
      imageUrl:           uploadedImageUrl,
      status:             'SENT',
      deletedForEveryone: false,
      deletedForUserIds:  [],
      createdAt:          new Date().toISOString(),
      sender: { id: currentUserId, firstName: currentUsername, lastName: '', profileImage: null },
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch('/api/messages/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ conversationId: activeConv.id!, content, imageUrl: uploadedImageUrl }),
      })
      if (res.ok) {
        const { message } = await res.json()
        setMessages(prev => prev.map(m => m.id === tempId ? message : m))
        const now     = new Date().toISOString()
        const lastMsg = { content: content || '📷 Photo', senderId: currentUserId, status: 'SENT' as const, createdAt: now }
        setConversations(prev =>
          prev.map(c => c.user.id === activeConv.user.id ? { ...c, lastMessage: lastMsg, lastMessageAt: now } : c)
              .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
        )
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }, [inputValue, imageFile, activeConv, isSending, currentUserId, currentUsername, clearImage])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInputValue(prev => prev + emoji)
    setShowEmoji(false)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const openContextMenu = useCallback((messageId: string, isMine: boolean, x: number, y: number) => {
    setContextMenu({ messageId, isMine, x, y })
  }, [])

  const deleteMessage = useCallback(async (type: 'for_me' | 'for_everyone') => {
    if (!contextMenu) return
    const { messageId } = contextMenu
    setContextMenu(null)
    setDeletingMsgId(messageId)

    try {
      const res = await fetch('/api/messages/delete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messageId, type }),
      })
      if (res.ok) {
        if (type === 'for_me') {
          setMessages(prev => prev.filter(m => m.id !== messageId))
        } else {
          setMessages(prev => prev.map(m =>
            m.id === messageId
              ? { ...m, deletedForEveryone: true, content: '', imageUrl: null }
              : m
          ))
        }
      }
    } catch { /* ignore */ }
    finally { setDeletingMsgId(null) }
  }, [contextMenu])

  const deleteChat = useCallback(async () => {
    if (!activeConv?.id) return
    setShowHeaderMenu(false)
    setIsDeletingChat(true)

    try {
      const res = await fetch(`/api/messages/${activeConv.id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== activeConv.id))
        setActiveConv(null)
        setMessages([])
        setIsMobileChat(false)
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      }
    } catch { /* ignore */ }
    finally { setIsDeletingChat(false) }
  }, [activeConv])

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = conversations.filter(c =>
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groups  = groupByDate(messages)
  const canSend = (Boolean(inputValue.trim()) || Boolean(imageFile)) && !isSending && !isUploadingImage

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
    <style>{`
      .msg-scroll::-webkit-scrollbar { width: 2px; }
      .msg-scroll::-webkit-scrollbar-track { background: transparent; }
      .msg-scroll::-webkit-scrollbar-thumb { background: rgba(245,197,24,0.5); border-radius: 99px; }
      .msg-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245,197,24,0.85); }
      .msg-scroll { scrollbar-width: thin; scrollbar-color: rgba(245,197,24,0.5) transparent; }
    `}</style>

    {/* Hidden file input */}
    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

    {/* Message context menu (portal-like fixed positioning) */}
    <AnimatePresence>
      {contextMenu && (
        <MessageContextMenu
          ctx={contextMenu}
          onDeleteForMe={() => deleteMessage('for_me')}
          onDeleteForEveryone={() => deleteMessage('for_everyone')}
          onClose={() => setContextMenu(null)}
        />
      )}
    </AnimatePresence>

    <div
      className="flex overflow-hidden -mx-4 -mt-6 -mb-20 lg:mx-0 lg:mt-0 lg:mb-0 lg:rounded-2xl h-[calc(100dvh-4rem-60px)] lg:h-[calc(100svh-8.5rem)]"
      style={{ background: 'var(--cr-bg-card)', boxShadow: 'var(--cr-shadow-card)' }}
    >
      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <div
        className={`${isMobileChat ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-[300px] xl:w-[340px] shrink-0 border-r`}
        style={{ borderColor: 'var(--cr-border)' }}
      >
        <div className="px-4 pt-4 pb-3 border-b space-y-3" style={{ borderColor: 'var(--cr-border)' }}>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--cr-text-1)' }}>
            Messages
          </h2>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--cr-bg-surface)' }}>
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--cr-text-muted)' }} />
            <input
              type="text" placeholder="Search conversations…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none" style={{ color: 'var(--cr-text-1)' }}
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                  onClick={() => setSearchQuery('')}>
                  <X className="w-3.5 h-3.5" style={{ color: 'var(--cr-text-muted)' }} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 msg-scroll">
          {loadingConvs ? (
            Array.from({ length: 7 }).map((_, i) => <ConvSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <MessageCircle className="w-9 h-9 mb-3" style={{ color: 'var(--cr-text-muted)', opacity: 0.5 }} />
              <p className="text-sm font-medium" style={{ color: 'var(--cr-text-muted)' }}>
                {searchQuery ? 'No results found' : 'No conversations yet'}
              </p>
              {!searchQuery && (
                <p className="text-xs mt-1" style={{ color: 'var(--cr-text-muted)', opacity: 0.7 }}>
                  Follow other chefs to message them
                </p>
              )}
            </div>
          ) : (
            <motion.div initial="hidden" animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}>
              {filtered.map(conv => (
                <motion.div key={conv.id ?? conv.user.id}
                  variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE } } }}>
                  <ConversationItem
                    conv={conv}
                    isActive={activeConv?.user.id === conv.user.id}
                    currentUserId={currentUserId}
                    onClick={() => selectConv(conv)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Right Chat Panel ───────────────────────────────────────────────── */}
      <div className={`${!isMobileChat ? 'hidden' : 'flex'} lg:flex flex-col flex-1 min-w-0`}>
        <AnimatePresence mode="wait">
          {activeConv ? (
            <motion.div key={activeConv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }} className="flex flex-col flex-1 min-h-0">

              {/* ── Chat Header ─────────────────────────────────────────── */}
              <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
                style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsMobileChat(false)}
                  className="lg:hidden p-1.5 rounded-xl" style={{ background: 'var(--cr-bg-surface)' }}>
                  <ArrowLeft className="w-4 h-4" style={{ color: 'var(--cr-text-1)' }} />
                </motion.button>

                <Avatar name={activeConv.user.name} avatar={activeConv.user.avatar} isOnline={activeConv.user.isOnline} size="md" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--cr-text-1)' }}>
                    {activeConv.user.name}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--cr-text-muted)' }}>
                    @{activeConv.user.username}
                  </p>
                </div>

                {/* Three dots with dropdown */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setShowHeaderMenu(v => !v)}
                    className="p-2 rounded-xl"
                    style={{ background: showHeaderMenu ? 'rgba(245,197,24,0.10)' : 'var(--cr-bg-surface)' }}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: 'var(--cr-text-2)' }} />
                  </motion.button>

                  <AnimatePresence>
                    {showHeaderMenu && (
                      <HeaderMenu
                        onDeleteChat={deleteChat}
                        isDeletingChat={isDeletingChat}
                        onClose={() => setShowHeaderMenu(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Messages Area ────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 min-h-0 msg-scroll"
                style={{ background: 'var(--cr-bg-surface)' }}
                onClick={() => { setContextMenu(null); setShowHeaderMenu(false) }}
              >
                {loadingMsgs ? (
                  <MsgSkeleton />
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <ChefHat className="w-10 h-10 mb-3" style={{ color: 'var(--cr-text-muted)', opacity: 0.5 }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--cr-text-muted)' }}>No messages yet</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--cr-text-muted)', opacity: 0.7 }}>
                      Say hi to {activeConv.user.name.split(' ')[0]}! 👋
                    </p>
                  </div>
                ) : (
                  groups.map(group => (
                    <div key={group.key} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px" style={{ background: 'var(--cr-border)' }} />
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--cr-bg-card)', color: 'var(--cr-text-muted)', border: '1px solid var(--cr-border)' }}>
                          {formatDateHeader(group.messages[0].createdAt)}
                        </span>
                        <div className="flex-1 h-px" style={{ background: 'var(--cr-border)' }} />
                      </div>

                      {group.messages.map((msg, idx) => {
                        const nextMsg    = group.messages[idx + 1]
                        const showAvatar = !nextMsg || nextMsg.senderId !== msg.senderId
                        return (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isMine={msg.senderId === currentUserId}
                            showAvatar={showAvatar}
                            isDeleting={deletingMsgId === msg.id}
                            onContextMenu={(msgId, mine, x, y) => openContextMenu(msgId, mine, x, y)}
                          />
                        )
                      })}
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              {/* ── Composer ─────────────────────────────────────────────── */}
              <div className="px-3 py-3 border-t shrink-0"
                style={{ borderColor: 'var(--cr-border)', background: 'var(--cr-bg-card)' }}>
                {/* Image preview */}
                <AnimatePresence>
                  {imagePreview && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="mb-2 overflow-hidden">
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="preview"
                          className="h-20 w-auto rounded-xl object-cover border" style={{ borderColor: 'var(--cr-border)' }} />
                        <button onClick={clearImage}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow"
                          style={{ background: '#ef4444', color: '#fff' }}>
                          <X className="w-3 h-3" />
                        </button>
                        {isUploadingImage && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl"
                            style={{ background: 'rgba(0,0,0,0.45)' }}>
                            <Loader2 className="w-5 h-5 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <AnimatePresence>
                    {showEmoji && (
                      <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
                    )}
                  </AnimatePresence>

                  <div className="flex items-end gap-2 rounded-2xl px-3 py-2"
                    style={{ background: 'var(--cr-bg-surface)', border: '1px solid var(--cr-border)' }}>
                    <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowEmoji(v => !v)}
                      title="Emoji" className="p-1 shrink-0 mb-0.5 transition-colors"
                      style={{ color: showEmoji ? '#F5C518' : 'var(--cr-text-muted)' }}>
                      <Smile className="w-5 h-5" />
                    </motion.button>

                    <textarea ref={inputRef} value={inputValue}
                      onChange={e => {
                        setInputValue(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message…" rows={1}
                      className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed py-0.5"
                      style={{ color: 'var(--cr-text-1)', minHeight: '22px', maxHeight: '100px' }}
                    />

                    <motion.button whileTap={{ scale: 0.88 }} onClick={() => fileInputRef.current?.click()}
                      title="Send image" className="p-1 shrink-0 mb-0.5 transition-colors"
                      style={{ color: imageFile ? '#F5C518' : 'var(--cr-text-muted)' }}>
                      <ImageIcon className="w-5 h-5" />
                    </motion.button>

                    <motion.button
                      whileHover={canSend ? { scale: 1.08 } : {}} whileTap={canSend ? { scale: 0.9 } : {}}
                      onClick={sendMessage} disabled={!canSend}
                      className="p-2 rounded-xl shrink-0 transition-all mb-0.5"
                      style={{
                        background: canSend ? 'linear-gradient(135deg,#F5C518,#FFB800)' : 'var(--cr-border)',
                        color:   canSend ? '#1A1A1A' : 'var(--cr-text-muted)',
                        opacity: isSending ? 0.7 : 1,
                      }}>
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </motion.button>
                  </div>
                </div>

                <p className="text-[10px] text-center mt-1.5 select-none"
                  style={{ color: 'var(--cr-text-muted)', opacity: 0.6 }}>
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </motion.div>
          ) : (
            <EmptyChatState key="empty" />
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  )
}
