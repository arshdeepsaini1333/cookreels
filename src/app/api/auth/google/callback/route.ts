import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { exchangeCodeForTokens, fetchGoogleUserInfo } from '@/lib/google-oauth'
import { GOOGLE_STATE_COOKIE } from '../route'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const cookieStore = await cookies()
  const storedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value
  cookieStore.delete(GOOGLE_STATE_COOKIE)

  // User denied access or Google returned an error
  if (oauthError) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=oauth_cancelled`)
  }

  // CSRF state validation
  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=oauth_failed`)
  }

  try {
    const { access_token } = await exchangeCodeForTokens(code)
    const googleUser = await fetchGoogleUserInfo(access_token)

    // Look up by googleId first, then by email
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.id }, { email: googleUser.email }] },
    })

    if (user) {
      // CASE 3: Email-only account — link Google to it
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.id,
            isEmailVerified: true,
          },
        })
      }
      // CASE 2 (from Google's side): existing Google user → just sign in
    } else {
      // CASE 1: Brand-new Google sign-up
      const username = await generateUniqueUsername(googleUser.email, googleUser.given_name)

      user = await prisma.user.create({
        data: {
          firstName: googleUser.given_name ?? '',
          lastName: googleUser.family_name ?? '',
          username,
          email: googleUser.email,
          googleId: googleUser.id,
          isEmailVerified: true,
          // password intentionally omitted — null by default
        },
      })
    }

    await createSession(user.id, user.username)
    return NextResponse.redirect(`${APP_URL}/`)
  } catch (error) {
    console.error('[google/callback]', error)
    return NextResponse.redirect(`${APP_URL}/auth/login?error=oauth_failed`)
  }
}

async function generateUniqueUsername(email: string, givenName: string): Promise<string> {
  // Build a clean base from the email prefix (fall back to first name)
  const raw = email.split('@')[0] || givenName || 'user'
  const base = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 15) || 'user'

  // Try without suffix first
  const taken = await prisma.user.findUnique({ where: { username: base } })
  if (!taken) return base

  // Append random 4-digit suffix; retry up to 10 times
  for (let i = 0; i < 10; i++) {
    const candidate = `${base}_${Math.floor(1000 + Math.random() * 9000)}`
    const exists = await prisma.user.findUnique({ where: { username: candidate } })
    if (!exists) return candidate
  }

  // Absolute fallback — timestamp suffix is always unique enough
  return `${base}_${Date.now().toString().slice(-6)}`
}
