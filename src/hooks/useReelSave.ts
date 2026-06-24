'use client'

import { useState, useEffect, useCallback } from 'react'

export function useReelSave(reelId: string, isActive = true) {
  const [saved,   setSaved]   = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!reelId || !isActive) return
    fetch(`/api/reels/${reelId}/save`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSaved(d.saved) })
      .catch(() => {})
  }, [reelId, isActive])

  const toggle = useCallback(async () => {
    if (pending || saved === null) return

    const newSaved = !saved
    setSaved(newSaved)
    setPending(true)

    try {
      const res = await fetch(`/api/reels/${reelId}/save`, {
        method: newSaved ? 'POST' : 'DELETE',
      })
      if (!res.ok) {
        setSaved(!newSaved)
      }
    } catch {
      setSaved(!newSaved)
    } finally {
      setPending(false)
    }
  }, [reelId, saved, pending])

  return { saved: saved ?? false, saveLoaded: saved !== null, toggle, pending }
}
