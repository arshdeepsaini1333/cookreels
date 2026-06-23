// Server-Sent Events pub/sub bus.
// Works for single-process Node.js deployments (next dev, next start).

type Listener = (payload: string) => void

class SSEBus {
  private readonly subs = new Map<string, Set<Listener>>()

  subscribe(key: string, fn: Listener): () => void {
    if (!this.subs.has(key)) this.subs.set(key, new Set())
    this.subs.get(key)!.add(fn)
    return () => {
      const set = this.subs.get(key)
      if (!set) return
      set.delete(fn)
      if (set.size === 0) this.subs.delete(key)
    }
  }

  publish(key: string, event: string, data: unknown): void {
    const listeners = this.subs.get(key)
    if (!listeners?.size) return
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const fn of listeners) {
      try { fn(payload) } catch { /* client already disconnected */ }
    }
  }
}

const g = global as unknown as { _sseBus?: SSEBus }
export const sseBus: SSEBus = g._sseBus ?? (g._sseBus = new SSEBus())
