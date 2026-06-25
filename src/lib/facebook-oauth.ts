const FB_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth'
const FB_TOKEN_URL = 'https://graph.facebook.com/v19.0/oauth/access_token'
const FB_USERINFO_URL = 'https://graph.facebook.com/me'

export type FacebookUserInfo = {
  id: string
  name: string
  email?: string
  first_name?: string
  last_name?: string
  picture?: {
    data: {
      url: string
      width: number
      height: number
      is_silhouette: boolean
    }
  }
}

export function buildFacebookAuthURL(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID!,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
    response_type: 'code',
    scope: 'email,public_profile',
    state,
  })
  return `${FB_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string }> {
  const params = new URLSearchParams({
    code,
    client_id: process.env.FACEBOOK_CLIENT_ID!,
    client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
  })

  const res = await fetch(`${FB_TOKEN_URL}?${params.toString()}`)

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Facebook token exchange failed: ${err}`)
  }

  return res.json() as Promise<{ access_token: string }>
}

export async function fetchFacebookUserInfo(accessToken: string): Promise<FacebookUserInfo> {
  const params = new URLSearchParams({
    fields: 'id,name,email,first_name,last_name,picture.type(large)',
    access_token: accessToken,
  })

  const res = await fetch(`${FB_USERINFO_URL}?${params.toString()}`)

  if (!res.ok) {
    throw new Error('Failed to fetch Facebook user info')
  }

  return res.json() as Promise<FacebookUserInfo>
}
