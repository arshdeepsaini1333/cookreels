'use client'

import { useEffect, useRef } from 'react'

type Handler = (data: unknown) => void

interface PoolEntry {
  es: EventSource
  subs: Map<string, Set<Handler>>
  refs: number
}

// One EventSource per reelId, shared by all hooks that subscribe to that reel.
// Prevents opening duplicate /api/reels/:id/events connections.
const pool = new Map<string, PoolEntry>()
const ALL_EVENTS = ['reel:liked', 'reel:unliked', 'reel:commentAdded']

function acquire(reelId: string): PoolEntry {
  let entry = pool.get(reelId)
  if (!entry) {
    const es = new EventSource(`/api/reels/${reelId}/events`)
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
    pool.set(reelId, entry)
  }
  entry.refs++
  return entry
}

function release(reelId: string): void {
  const entry = pool.get(reelId)
  if (!entry) return
  entry.refs--
  if (entry.refs <= 0) {
    entry.es.close()
    pool.delete(reelId)
  }
}

/**
 * Subscribe to SSE events for a reel.
 * Shares one EventSource connection per reelId across all subscribers.
 * Connection opens when isActive=true, closes when last subscriber deactivates.
 */
export function useReelSSE(
  reelId: string,
  isActive: boolean,
  eventTypes: string[],
  onEvent: (type: string, data: unknown) => void,
): void {
  const cbRef = useRef(onEvent)
  cbRef.current = onEvent

  useEffect(() => {
    if (!isActive || !reelId) return
    const entry = acquire(reelId)

    const handlers = new Map<string, Handler>()
    for (const t of eventTypes) {
      const fn: Handler = (data) => cbRef.current(t, data)
      handlers.set(t, fn)
      entry.subs.get(t)?.add(fn)
    }

    return () => {
      handlers.forEach((fn, t) => entry.subs.get(t)?.delete(fn))
      release(reelId)
    }
  // eventTypes are constant arrays defined at call sites — excluding from deps is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelId, isActive])
}
