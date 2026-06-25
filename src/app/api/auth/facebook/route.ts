import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { buildFacebookAuthURL } from '@/lib/facebook-oauth'

export const FACEBOOK_STATE_COOKIE = 'facebook_oauth_state'
const STATE_MAX_AGE = 600 // 10 minutes

export async function GET() {
  const state = randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set(FACEBOOK_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MAX_AGE,
  })

  const url = buildFacebookAuthURL(state)
  return NextResponse.redirect(url)
}
