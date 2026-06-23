'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/shared/UserAvatar'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommentItem {
  id: string
  username: string
  userAvatar: string | null
  text: string
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diff = now - d.getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1)  return 'just now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}


// ─── Comment Input ────────────────────────────────────────────────────────────

interface CommentInputProps {
  currentUserAvatar?: string | null
  currentUserName?: string
  onSubmit: (text: string) => Promise<boolean>
  submitting: boolean
  autoFocus?: boolean
  dark?: boolean
}

export function CommentInput({
  currentUserAvatar, currentUserName = 'You',
  onSubmit, submitting, autoFocus = false, dark = false,
}: CommentInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    const ok = await onSubmit(trimmed)
    if (ok) setText('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const bg     = dark ? '#2B2B2D' : 'var(--cr-bg-surface)'
  const border = dark ? '#343438' : 'var(--cr-border)'
  const color  = dark ? '#fff'    : 'var(--cr-text-1)'

  return (
    <div className="flex items-center gap-2.5">
      <UserAvatar src={currentUserAvatar} name={currentUserName} size="sm" />
      <div
        className="flex-1 flex items-center gap-2 rounded-2xl px-3.5 py-2 border"
        style={{ background: bg, borderColor: border }}
      >
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          disabled={submitting}
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ color, caretColor: '#F5C518' }}
        />
        <AnimatePresence>
          {text.trim() && (
            <motion.button
              key="send"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.14 }}
              onClick={handleSubmit}
              disabled={submitting}
              aria-label="Post comment"
              className="flex-shrink-0"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#F5C518' }} />
                : <Send className="w-4 h-4" style={{ color: '#F5C518' }} />
              }
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Comment List ─────────────────────────────────────────────────────────────

interface CommentListProps {
  comments: CommentItem[]
  loading: boolean
  error?: string | null
  emptyMessage?: string
  dark?: boolean
  maxVisible?: number
}

function CommentSkeleton({ dark }: { dark: boolean }) {
  const bg = dark ? '#343438' : 'var(--cr-border)'
  return (
    <div className="flex gap-2.5 animate-pulse">
      <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: bg }} />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-2.5 rounded-full w-1/3" style={{ background: bg }} />
        <div className="h-2.5 rounded-full w-4/5" style={{ background: bg }} />
      </div>
    </div>
  )
}

export function CommentList({
  comments, loading, error, emptyMessage = 'No comments yet. Be the first!',
  dark = false, maxVisible,
}: CommentListProps) {
  const text1   = dark ? '#fff'      : 'var(--cr-text-1)'
  const text2   = dark ? '#A1A1AA'   : 'var(--cr-text-2)'
  const muted   = dark ? '#52525B'   : 'var(--cr-text-muted)'

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(i => <CommentSkeleton key={i} dark={dark} />)}
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: muted }}>
        {error}
      </p>
    )
  }

  const visible = maxVisible != null ? comments.slice(0, maxVisible) : comments

  if (!visible.length) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: muted }}>
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence initial={false}>
        {visible.map(c => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2.5"
          >
            <UserAvatar src={c.userAvatar} name={c.username} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: text1 }}>{c.username}</span>
                {c.createdAt && (
                  <span className="text-[10px]" style={{ color: muted }}>{fmtDate(c.createdAt)}</span>
                )}
              </div>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: text2 }}>{c.text}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ─── Full CommentSection ──────────────────────────────────────────────────────

interface CommentSectionProps {
  comments: CommentItem[]
  commentCount: number
  loading: boolean
  submitting: boolean
  error?: string | null
  onSubmit: (text: string) => Promise<boolean>
  currentUserAvatar?: string | null
  currentUserName?: string
  dark?: boolean
  maxVisible?: number
}

export function CommentSection({
  comments, commentCount, loading, submitting, error,
  onSubmit, currentUserAvatar, currentUserName, dark = false, maxVisible,
}: CommentSectionProps) {
  const text1 = dark ? '#fff' : 'var(--cr-text-1)'
  const muted = dark ? '#52525B' : 'var(--cr-text-muted)'

  function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        <h3 className="text-sm font-semibold" style={{ color: text1 }}>Comments</h3>
        {!loading && commentCount > 0 && (
          <span className="text-xs" style={{ color: muted }}>({fmt(commentCount)})</span>
        )}
      </div>

      <CommentList
        comments={comments}
        loading={loading}
        error={error}
        dark={dark}
        maxVisible={maxVisible}
      />

      <CommentInput
        currentUserAvatar={currentUserAvatar}
        currentUserName={currentUserName}
        onSubmit={onSubmit}
        submitting={submitting}
        dark={dark}
      />
    </div>
  )
}
