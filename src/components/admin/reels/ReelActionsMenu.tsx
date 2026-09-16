'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MoreHorizontal, Eye, PenLine, Flame, FlameKindling, EyeOff, CheckCircle2, Ban, ShieldCheck, Trash2 } from 'lucide-react'

const MENU_WIDTH = 200 // w-50

interface ReelActionsMenuProps {
  id: string
  isPublished: boolean
  isTrending: boolean
  isBanned: boolean
}

export function ReelActionsMenu({ id, isPublished, isTrending, isBanned }: ReelActionsMenuProps) {
  const router = useRouter()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition({ top: rect.bottom + 4, left: rect.right - MENU_WIDTH })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  async function patch(body: Record<string, unknown>) {
    setOpen(false)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/reels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string }
        alert(errBody.error ?? 'Failed to update reel')
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function runDelete() {
    setOpen(false)
    if (!confirm('Delete this reel? This cannot be undone.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/reels/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        alert(body.error ?? 'Failed to delete reel')
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="inline-block" style={{ opacity: busy ? 0.5 : 1, pointerEvents: busy ? 'none' : 'auto' }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-[var(--cr-accent-soft)]"
        style={{ color: 'var(--cr-text-muted)' }}
        aria-label="Reel actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && position && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 overflow-hidden rounded-xl py-1 shadow-2xl"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH, background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)' }}
          >
            <Link href={`/admin/reels/${id}`} className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)]" onClick={() => setOpen(false)}>
              <Eye size={14} /> View
            </Link>
            <Link href={`/admin/reels/${id}?edit=1`} className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)]" onClick={() => setOpen(false)}>
              <PenLine size={14} /> Edit
            </Link>
            <button onClick={() => patch({ isPublished: !isPublished })} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)]">
              {isPublished ? <><EyeOff size={14} /> Unpublish</> : <><CheckCircle2 size={14} /> Publish</>}
            </button>
            <button onClick={() => patch({ isTrending: !isTrending })} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--cr-text-2)] transition-colors hover:bg-[var(--cr-accent-soft)]">
              {isTrending ? <><FlameKindling size={14} /> Unfeature</> : <><Flame size={14} /> Feature as Trending</>}
            </button>
            <button
              onClick={() => patch({ isBanned: !isBanned })}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--cr-accent-soft)]"
              style={{ color: isBanned ? 'var(--cr-text-2)' : '#EF4444' }}
            >
              {isBanned ? <><ShieldCheck size={14} /> Unban</> : <><Ban size={14} /> Ban</>}
            </button>
            <button onClick={runDelete} className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--cr-accent-soft)]" style={{ color: '#EF4444' }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}
