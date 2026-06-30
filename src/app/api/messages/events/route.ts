import { getSession } from '@/lib/session'
import { NextResponse } from 'next/server'
import { sseBus } from '@/lib/sse'

// GET /api/messages/events — SSE stream for real-time message delivery
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key     = `messages:${session.userId}`
  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | undefined

  const stream = new ReadableStream({
    start(controller) {
      function send(payload: string) {
        try { controller.enqueue(encoder.encode(payload)) } catch { /* client disconnected */ }
      }

      send(': connected\n\n')
      unsubscribe = sseBus.subscribe(key, send)

      const heartbeat = setInterval(() => {
        if (req.signal.aborted) { clearInterval(heartbeat); return }
        send(': heartbeat\n\n')
      }, 25_000)

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe?.()
        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      unsubscribe?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache, no-transform',
      Connection:        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
