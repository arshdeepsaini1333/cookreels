import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { exchangeCodeForToken, fetchFacebookUserInfo } from '@/lib/facebook-oauth'
import { FACEBOOK_STATE_COOKIE } from '../route'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  const cookieStore = await cookies()
  const storedState = cookieStore.get(FACEBOOK_STATE_COOKIE)?.value
  cookieStore.delete(FACEBOOK_STATE_COOKIE)

  // User denied access or Facebook returned an error
  if (oauthError) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=fb_cancelled`)
  }

  // CSRF state validation
  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=fb_failed`)
  }

  try {
    const { access_token } = await exchangeCodeForToken(code)
    const fbUser = await fetchFacebookUserInfo(access_token)

    // Only use Facebook profile picture if it is not the default silhouette
    const pictureUrl =
      fbUser.picture?.data && !fbUser.picture.data.is_silhouette
        ? fbUser.picture.data.url
        : undefined

    // Look up by facebookId first, then fall back to email match for account linking
    const orConditions: Array<{ facebookId: string } | { email: string }> = [
      { facebookId: fbUser.id },
    ]
    if (fbUser.email) orConditions.push({ email: fbUser.email })

    let user = await prisma.user.findFirst({
      where: { OR: orConditions },
    })

    if (user) {
      // CASE 2 / 3: Existing account (email-only or Google) — link Facebook to it
      // CASE 4: Already-linked Facebook user — sign in normally, nothing to update
      if (!user.facebookId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            facebookId: fbUser.id,
            isEmailVerified: true,
            // Never overwrite a custom profile picture the user already set
            ...(!user.profileImage && pictureUrl ? { profileImage: pictureUrl } : {}),
          },
        })
      }
    } else {
      // CASE 1: Brand-new signup via Facebook
      if (!fbUser.email) {
        // Cannot create an account without an email address
        return NextResponse.redirect(`${APP_URL}/auth/login?error=fb_no_email`)
      }

      const username = await generateUniqueUsername(fbUser.email, fbUser.first_name ?? fbUser.name)

      // Derive first/last name from the Graph API fields or fall back to splitting display name
      const firstName = fbUser.first_name ?? fbUser.name.split(' ')[0] ?? ''
      const lastName = fbUser.last_name ?? fbUser.name.split(' ').slice(1).join(' ') ?? ''

      user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          username,
          email: fbUser.email,
          facebookId: fbUser.id,
          isEmailVerified: true,
          isActive: true, // email pre-verified by Facebook
          ...(pictureUrl ? { profileImage: pictureUrl } : {}),
        },
      })
    }

    await createSession(user.id, user.username)
    return NextResponse.redirect(`${APP_URL}/`)
  } catch (error) {
    console.error('[facebook/callback]', error)
    return NextResponse.redirect(`${APP_URL}/auth/login?error=fb_failed`)
  }
}

async function generateUniqueUsername(email: string, givenName: string): Promise<string> {
  const raw = email.split('@')[0] || givenName || 'user'
  const base =
    raw
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 15) || 'user'

  const taken = await prisma.user.findUnique({ where: { username: base } })
  if (!taken) return base

  for (let i = 0; i < 10; i++) {
    const candidate = `${base}_${Math.floor(1000 + Math.random() * 9000)}`
    const exists = await prisma.user.findUnique({ where: { username: candidate } })
    if (!exists) return candidate
  }

  return `${base}_${Date.now().toString().slice(-6)}`
}
