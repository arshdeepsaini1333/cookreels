import { cookies } from 'next/headers'
import { cache } from 'react'
import { createHmac, timingSafeEqual } from 'crypto'
import type { AdminRole } from '@/generated/prisma'

const SECRET = process.env.ADMIN_SESSION_SECRET ?? 'cookreels-admin-dev-secret-change-in-prod'
export const ADMIN_COOKIE_NAME = 'cr_admin_session'
const MAX_AGE = 60 * 60 * 12 // 12 hours in seconds — shorter than user sessions, elevated privilege

export type AdminSessionPayload = {
  adminId: string
  name: string
  email: string
  role: AdminRole
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

export function encodeAdminSession(payload: AdminSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data)}`
}

export function decodeAdminSession(token: string): AdminSessionPayload | null {
  try {
    const lastDot = token.lastIndexOf('.')
    if (lastDot === -1) return null

    const data = token.slice(0, lastDot)
    const sig = token.slice(lastDot + 1)
    const expected = sign(data)

    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null
    }

    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8'),
    ) as AdminSessionPayload

    if (payload.expiresAt < Date.now()) return null

    return payload
  } catch {
    return null
  }
}

export async function createAdminSession(
  adminId: string,
  name: string,
  email: string,
  role: AdminRole,
): Promise<void> {
  const token = encodeAdminSession({
    adminId,
    name,
    email,
    role,
    expiresAt: Date.now() + MAX_AGE * 1000,
  })
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, token, COOKIE_OPTIONS)
}

// cache() memoizes within a single render pass — safe here since it only decodes
// the cookie already on the request, no DB round trip.
export const getAdminSession = cache(async (): Promise<AdminSessionPayload | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (!token) return null
  return decodeAdminSession(token)
})

export async function deleteAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
}
