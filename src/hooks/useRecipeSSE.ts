'use client'

import { useEffect, useRef } from 'react'

type Handler = (data: unknown) => void

interface PoolEntry {
  es: EventSource
  subs: Map<string, Set<Handler>>
  refs: number
}

// One EventSource per recipeId, shared by all hooks that subscribe to that recipe.
// Prevents opening duplicate /api/recipes/:id/events connections.
const pool = new Map<string, PoolEntry>()
const ALL_EVENTS = ['recipe:liked', 'recipe:unliked', 'recipe:commentAdded']

function acquire(recipeId: string): PoolEntry {
  let entry = pool.get(recipeId)
  if (!entry) {
    const es = new EventSource(`/api/recipes/${recipeId}/events`)
    const subs = new Map<string, Set<Handler>>()
    ALL_EVENTS.forEach(t => {
      const set: Set<Handler> = new Set()
      subs.set(t, set)
      es.addEventListener(t, (e: Event) => {
        try {
          const data = JSON.parse((e as MessageEvent).data)
          set.forEach(fn => fn(data))
        } catch { /* ignore malformed payloads */ }
      })
    })
    entry = { es, subs, refs: 0 }
    pool.set(recipeId, entry)
  }
  entry.refs++
  return entry
}

function release(recipeId: string): void {
  const entry = pool.get(recipeId)
  if (!entry) return
  entry.refs--
  if (entry.refs <= 0) {
    entry.es.close()
    pool.delete(recipeId)
  }
}

/**
 * Subscribe to SSE events for a recipe.
 * Shares one EventSource connection per recipeId across all subscribers.
 * Connection opens when isActive=true, closes when last subscriber deactivates.
 */
export function useRecipeSSE(
  recipeId: string,
  isActive: boolean,
  eventTypes: string[],
  onEvent: (type: string, data: unknown) => void,
): void {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent

  useEffect(() => {
    if (!isActive || !recipeId) return
    const entry = acquire(recipeId)

    const handlers = new Map<string, Handler>()
    for (const t of eventTypes) {
      const fn: Handler = (data) => cbRef.current(t, data)
      handlers.set(t, fn)
      entry.subs.get(t)?.add(fn)
    }

    return () => {
      handlers.forEach((fn, t) => entry.subs.get(t)?.delete(fn))
      release(recipeId)
    }
  // eventTypes are constant arrays defined at call sites — excluding from deps is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId, isActive])
}
