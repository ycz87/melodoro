/**
 * Auth routes — 9 endpoints for email code + OAuth + session management
 */
import { Hono } from 'hono'
import type { Env } from '../index'
import { signAccessToken, generateRefreshTokenId } from '../services/jwt'
import { sendVerificationEmail, generateCode } from '../services/email'
import {
  googleAuthUrl, googleExchangeCode, googleUserInfo,
  microsoftAuthUrl, microsoftExchangeCode, microsoftUserInfo,
} from '../services/oauth'
import type { OAuthUserInfo } from '../services/oauth'
import { authMiddleware } from '../middleware/auth'
import { verifyTurnstile } from '../services/turnstile'

type AuthEnv = { Bindings: Env; Variables: { userId: string; email: string } }

const FRONTEND_URL = 'https://clock.cosmelon.app'
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 // 30 days in seconds

export const authRoutes = new Hono<AuthEnv>()

// ─── Helpers ───

async function findOrCreateUser(
  db: D1Database, email: string, provider: string, name?: string, avatar?: string,
): Promise<{ id: string; email: string; display_name: string | null; avatar_url: string | null }> {
  const existing = await db.prepare('SELECT id, email, display_name, avatar_url FROM users WHERE email = ?').bind(email).first<{
    id: string; email: string; display_name: string | null; avatar_url: string | null
  }>()
  if (existing) return existing

  const id = crypto.randomUUID()
  await db.prepare(
    'INSERT INTO users (id, email, display_name, avatar_url, auth_provider) VALUES (?, ?, ?, ?, ?)',
  ).bind(id, email, name || null, avatar || null, provider).run()
  return { id, email, display_name: name || null, avatar_url: avatar || null }
}

async function issueTokens(
  env: Env, userId: string, email: string,
): Promise<{ accessToken: string; refreshTokenId: string }> {
  const accessToken = await signAccessToken(env.JWT_SECRET, userId, email)
  const refreshTokenId = generateRefreshTokenId()
  await env.SESSION_KV.put(`refresh:${refreshTokenId}`, userId, { expirationTtl: REFRESH_TOKEN_TTL })
  return { accessToken, refreshTokenId }
}

function setRefreshCookie(headers: Headers, refreshTokenId: string) {
  headers.set(
    'Set-Cookie',
    `refresh_token=${refreshTokenId}; HttpOnly; Secure; SameSite=None; Path=/auth; Max-Age=${REFRESH_TOKEN_TTL}`,
  )
}

function clearRefreshCookie(headers: Headers) {
  headers.set(
    'Set-Cookie',
    'refresh_token=; HttpOnly; Secure; SameSite=None; Path=/auth; Max-Age=0',
  )
}

function getRefreshTokenFromCookie(c: { req: { header: (name: string) => string | undefined } }): string | null {
  const cookie = c.req.header('Cookie') || ''
  const match = cookie.match(/refresh_token=([^;]+)/)
  return match ? match[1] : null
}

// ─── 1. POST /email/send-code ───

authRoutes.post('/email/send-code', async (c) => {
  const body = await c.req.json<{ email?: string; turnstileToken?: string }>()

  // Turnstile verification
  const turnstileToken = body.turnstileToken
  if (!turnstileToken) {
    return c.json({ error: 'Turnstile verification required' }, 403)
  }
  const ip = c.req.header('CF-Connecting-IP') || undefined
  const turnstileOk = await verifyTurnstile(c.env.TURNSTILE_SECRET, turnstileToken, ip)
  if (!turnstileOk) {
    return c.json({ error: 'Turnstile verification failed' }, 403)
  }

  // Global IP rate limit: max 5 requests per 60s
  const ipRateKey = `rate:ip:${ip || 'unknown'}`
  const ipAttempts = parseInt(await c.env.SESSION_KV.get(ipRateKey) || '0', 10)
  if (ipAttempts >= 5) {
    return c.json({ error: 'Too many requests from this IP' }, 429)
  }
  await c.env.SESSION_KV.put(ipRateKey, String(ipAttempts + 1), { expirationTtl: 60 })

  const email = body.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Invalid email' }, 400)
  }

  // Rate limit: 60s cooldown
  const rateKey = `rate:${email}`
  const existing = await c.env.SESSION_KV.get(rateKey)
  if (existing) {
    return c.json({ error: 'Please wait 60 seconds before requesting another code' }, 429)
  }

  const code = generateCode()
  await c.env.SESSION_KV.put(`code:${email}`, code, { expirationTtl: 900 })
  await c.env.SESSION_KV.put(rateKey, '1', { expirationTtl: 60 })

  const sent = await sendVerificationEmail(c.env.RESEND_API_KEY, email, code)
  if (!sent) {
    return c.json({ error: 'Failed to send email' }, 500)
  }

  return c.json({ ok: true })
})

// ─── 2. POST /email/verify ───

authRoutes.post('/email/verify', async (c) => {
  const body = await c.req.json<{ email?: string; code?: string }>()
  const email = body.email?.trim().toLowerCase()
  const code = body.code?.trim()
  if (!email || !code) return c.json({ error: 'Email and code required' }, 400)

  // Rate limit: max 5 verify attempts per email per 15 minutes
  const attemptKey = `verify_attempts:${email}`
  const attempts = parseInt(await c.env.SESSION_KV.get(attemptKey) || '0', 10)
  if (attempts >= 5) {
    return c.json({ error: 'Too many attempts. Please request a new code.' }, 429)
  }
  await c.env.SESSION_KV.put(attemptKey, String(attempts + 1), { expirationTtl: 900 })

  const stored = await c.env.SESSION_KV.get(`code:${email}`)
  if (!stored || stored !== code) {
    return c.json({ error: 'Invalid or expired code' }, 400)
  }

  // Delete used code and attempt counter
  await c.env.SESSION_KV.delete(`code:${email}`)
  await c.env.SESSION_KV.delete(attemptKey)

  const user = await findOrCreateUser(c.env.DB, email, 'email')
  const { accessToken, refreshTokenId } = await issueTokens(c.env, user.id, email)

  const res = c.json({
    accessToken,
    user: { id: user.id, email: user.email, displayName: user.display_name, avatarUrl: user.avatar_url },
  })
  setRefreshCookie(res.headers, refreshTokenId)
  return res
})

// ─── 3. GET /google/redirect ───

authRoutes.get('/google/redirect', async (c) => {
  const state = crypto.randomUUID()
  // Store state in KV with 10-minute TTL for CSRF validation
  await c.env.SESSION_KV.put(`oauth_state:${state}`, '1', { expirationTtl: 600 })
  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`
  const url = googleAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri, state)
  return c.redirect(url)
})

// ─── 4. GET /google/callback ───

authRoutes.get('/google/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code) return c.json({ error: 'Missing code' }, 400)

  // Validate OAuth state to prevent CSRF
  if (!state) return c.json({ error: 'Missing state parameter' }, 400)
  const storedState = await c.env.SESSION_KV.get(`oauth_state:${state}`)
  if (!storedState) return c.json({ error: 'Invalid or expired state' }, 400)
  await c.env.SESSION_KV.delete(`oauth_state:${state}`)

  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`
  const tokens = await googleExchangeCode(c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, code, redirectUri)
  const info = await googleUserInfo(tokens.access_token)
  return handleOAuthCallback(c.env, info)
})

// ─── 5. GET /microsoft/redirect ───

authRoutes.get('/microsoft/redirect', async (c) => {
  const state = crypto.randomUUID()
  // Store state in KV with 10-minute TTL for CSRF validation
  await c.env.SESSION_KV.put(`oauth_state:${state}`, '1', { expirationTtl: 600 })
  const redirectUri = `${new URL(c.req.url).origin}/auth/microsoft/callback`
  const url = microsoftAuthUrl(c.env.MICROSOFT_CLIENT_ID, redirectUri, state)
  return c.redirect(url)
})

// ─── 6. GET /microsoft/callback ───

authRoutes.get('/microsoft/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code) return c.json({ error: 'Missing code' }, 400)

  // Validate OAuth state to prevent CSRF
  if (!state) return c.json({ error: 'Missing state parameter' }, 400)
  const storedState = await c.env.SESSION_KV.get(`oauth_state:${state}`)
  if (!storedState) return c.json({ error: 'Invalid or expired state' }, 400)
  await c.env.SESSION_KV.delete(`oauth_state:${state}`)

  const redirectUri = `${new URL(c.req.url).origin}/auth/microsoft/callback`
  const tokens = await microsoftExchangeCode(c.env.MICROSOFT_CLIENT_ID, c.env.MICROSOFT_CLIENT_SECRET, code, redirectUri)
  const info = await microsoftUserInfo(tokens.access_token)
  return handleOAuthCallback(c.env, info)
})

async function handleOAuthCallback(env: Env, info: OAuthUserInfo): Promise<Response> {
  const user = await findOrCreateUser(env.DB, info.email, info.provider, info.name, info.picture)
  const { accessToken, refreshTokenId } = await issueTokens(env, user.id, info.email)

  const redirectUrl = `${FRONTEND_URL}/?auth=success#access_token=${accessToken}`
  const res = Response.redirect(redirectUrl, 302)
  // Response.redirect returns immutable headers, so we create a new response
  const mutableRes = new Response(res.body, {
    status: res.status,
    headers: new Headers(res.headers),
  })
  setRefreshCookie(mutableRes.headers, refreshTokenId)
  return mutableRes
}

// ─── 7. POST /refresh ───

authRoutes.post('/refresh', async (c) => {
  const refreshTokenId = getRefreshTokenFromCookie(c)
  if (!refreshTokenId) return c.json({ error: 'No refresh token' }, 401)

  const userId = await c.env.SESSION_KV.get(`refresh:${refreshTokenId}`)
  if (!userId) return c.json({ error: 'Invalid refresh token' }, 401)

  // Get user email
  const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>()
  if (!user) return c.json({ error: 'User not found' }, 401)

  // Rotate refresh token
  await c.env.SESSION_KV.delete(`refresh:${refreshTokenId}`)
  const newAccessToken = await signAccessToken(c.env.JWT_SECRET, userId, user.email)
  const newRefreshId = generateRefreshTokenId()
  await c.env.SESSION_KV.put(`refresh:${newRefreshId}`, userId, { expirationTtl: REFRESH_TOKEN_TTL })

  const res = c.json({ accessToken: newAccessToken })
  setRefreshCookie(res.headers, newRefreshId)
  return res
})

// ─── 8. POST /logout ───

authRoutes.post('/logout', async (c) => {
  const refreshTokenId = getRefreshTokenFromCookie(c)
  if (refreshTokenId) {
    await c.env.SESSION_KV.delete(`refresh:${refreshTokenId}`)
  }
  const res = c.json({ ok: true })
  clearRefreshCookie(res.headers)
  return res
})

// ─── 9. GET /me ───

authRoutes.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare(
    'SELECT id, email, display_name, avatar_url, created_at FROM users WHERE id = ?',
  ).bind(userId).first()
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
    },
  })
})

// ─── 10. PUT /profile — 修改昵称 ───

authRoutes.put('/profile', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{ displayName?: string }>()
  const displayName = body.displayName?.trim()
  if (!displayName || displayName.length === 0 || displayName.length > 50) {
    return c.json({ error: 'Display name must be 1-50 characters' }, 400)
  }

  await c.env.DB.prepare(
    'UPDATE users SET display_name = ?, updated_at = datetime(\'now\') WHERE id = ?',
  ).bind(displayName, userId).run()

  const user = await c.env.DB.prepare(
    'SELECT id, email, display_name, avatar_url FROM users WHERE id = ?',
  ).bind(userId).first<{ id: string; email: string; display_name: string | null; avatar_url: string | null }>()

  return c.json({
    user: {
      id: user!.id,
      email: user!.email,
      displayName: user!.display_name,
      avatarUrl: user!.avatar_url,
    },
  })
})

// ─── 11. POST /avatar — 上传头像 ───

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB

authRoutes.post('/avatar', authMiddleware, async (c) => {
  const userId = c.get('userId')

  const formData = await c.req.formData()
  const file = formData.get('avatar')
  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No avatar file provided' }, 400)
  }

  if (!ALLOWED_TYPES[file.type]) {
    return c.json({ error: 'Only jpg, png, webp allowed' }, 400)
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return c.json({ error: 'File too large, max 2MB' }, 400)
  }

  const key = `avatars/${userId}`
  const arrayBuffer = await file.arrayBuffer()

  await c.env.AVATARS.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
  })

  // Build avatar URL using the public endpoint
  const origin = new URL(c.req.url).origin
  const avatarUrl = `${origin}/auth/avatar/${userId}`

  await c.env.DB.prepare(
    'UPDATE users SET avatar_url = ?, updated_at = datetime(\'now\') WHERE id = ?',
  ).bind(avatarUrl, userId).run()

  return c.json({ avatarUrl })
})

// ─── 12. GET /avatar/:userId — 公开头像端点 ───

authRoutes.get('/avatar/:userId', async (c) => {
  const userId = c.req.param('userId')
  const key = `avatars/${userId}`

  const object = await c.env.AVATARS.get(key)
  if (!object) {
    return c.json({ error: 'Avatar not found' }, 404)
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=86400')

  return new Response(object.body, { headers })
})
