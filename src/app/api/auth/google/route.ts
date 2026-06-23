import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { buildGoogleAuthURL } from '@/lib/google-oauth'

export const GOOGLE_STATE_COOKIE = 'google_oauth_state'
const STATE_MAX_AGE = 600 // 10 minutes

export async function GET() {
  const state = randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE,
  })

  const url = buildGoogleAuthURL(state)
  return NextResponse.redirect(url)
}
