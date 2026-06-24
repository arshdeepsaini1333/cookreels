'use client'

import { useState, useEffect, useCallback } from 'react'

export function useRecipeSave(recipeId: string, isActive = true) {
  const [saved,   setSaved]   = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!recipeId || !isActive) return
    fetch(`/api/recipes/${recipeId}/save`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSaved(d.saved) })
      .catch(() => {})
  }, [recipeId, isActive])

  const toggle = useCallback(async () => {
    if (pending || saved === null) return

    const newSaved = !saved
    setSaved(newSaved)
    setPending(true)

    try {
      const res = await fetch(`/api/recipes/${recipeId}/save`, {
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
  }, [recipeId, saved, pending])

  return { saved: saved ?? false, saveLoaded: saved !== null, toggle, pending }
}
