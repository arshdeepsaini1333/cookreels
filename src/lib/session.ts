import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.SESSION_SECRET ?? 'cookreels-dev-secret-change-in-prod'
export const COOKIE_NAME = 'cr_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export type SessionPayload = {
  userId: string
  username: string
  expiresAt: number
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE,
}

function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function encodeSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data)}`
}

export function decodeSession(token: string): SessionPayload | null {
  try {
    const lastDot = token.lastIndexOf('.')
    if (lastDot === -1) return null

    const data = token.slice(0, lastDot)
    const sig = token.slice(lastDot + 1)
    const expected = sign(data)

    // Timing-safe comparison prevents timing attacks
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null
    }

    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8'),
    ) as SessionPayload

    if (payload.expiresAt < Date.now()) return null

    return payload
  } catch {
    return null
  }
}

export async function createSession(userId: string, username: string): Promise<void> {
  const token = encodeSession({
    userId,
    username,
    expiresAt: Date.now() + MAX_AGE * 1000,
  })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS)
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return decodeSession(token)
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}