'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { MoreVertical, PenLine, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { ConfirmModal } from '@/components/shared/ConfirmModal'

type PostType = 'recipe' | 'reel'

const MENU_WIDTH = 168 // w-42

/**
 * Owner-only "..." menu for a post card (recipe or reel) — Edit / Archive
 * (hide from everyone but the owner) / Delete. Lives on the owner's own
 * profile grid only, so no permission check is needed here.
 */
export function PostActionsMenu({
  id,
  type,
  isPublished,
  onEdit,
}: {
  id: string
  type: PostType
  isPublished: boolean
  onEdit: () => void
}) {
  const router = useRouter()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setPosition({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8) })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  const endpoint = type === 'recipe' ? `/api/recipes/${id}` : `/api/reels/${id}`

  async function toggleArchive() {
    setOpen(false)
    setBusy(true)
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !isPublished }),
      })
      if (!res.ok) alert('Failed to update this post. Please try again.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function runDelete() {
    setBusy(true)
    try {
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="absolute top-2 right-2 z-10"
      style={{ opacity: busy ? 0.5 : 1, pointerEvents: busy ? 'none' : 'auto' }}
      onClick={e => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
        style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}
        aria-label="Post options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && position && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 overflow-hidden rounded-xl py-1 shadow-2xl"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH, background: 'var(--cr-bg-card)', border: '1px solid var(--cr-border)' }}
          >
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--cr-accent-soft)]"
              style={{ color: 'var(--cr-text-2)' }}
            >
              <PenLine size={14} /> Edit
            </button>
            <button
              onClick={toggleArchive}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--cr-accent-soft)]"
              style={{ color: 'var(--cr-text-2)' }}
            >
              {isPublished ? <Archive size={14} /> : <ArchiveRestore size={14} />}
              {isPublished ? 'Archive' : 'Unarchive'}
            </button>
            <button
              onClick={() => { setOpen(false); setConfirmDeleteOpen(true) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--cr-accent-soft)]"
              style={{ color: '#EF4444' }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>,
        document.body,
      )}

      <ConfirmModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={runDelete}
        title={`Delete this ${type}?`}
        message={`This ${type} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  )
}
