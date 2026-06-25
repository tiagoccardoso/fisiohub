import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_NAME = 'admin-session'

function base64UrlToText(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return atob(padded)
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false

  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }

  return diff === 0
}

async function signBody(body: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return bytesToBase64Url(new Uint8Array(signature))
}

async function readSession(req: NextRequest) {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) return null

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null

  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = await signBody(body, secret)
  if (!safeEqual(sig, expected)) return null

  try {
    const payload = JSON.parse(base64UrlToText(body)) as { exp?: number }
    if (!payload?.exp || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

function isPublicPath(pathname: string) {
  const publicRoutes = [
    '/api/auth',
    '/api/billing',
    '/api/stripe/checkout',
    '/api/stripe/portal',
    '/api/stripe/subscription/migrate',
    '/api/stripe/webhook',
    '/api/health',
    '/auth/login',
    '/auth/signup',
    '/auth/callback',
    '/public',
    '/robots.txt',
    '/sitemap.xml',
  ]

  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function isSubscriptionPath(pathname: string) {
  return pathname === '/assinatura' || pathname.startsWith('/assinatura/')
}

async function hasSubscriptionAccess(request: NextRequest) {
  try {
    const accessUrl = new URL('/api/billing/access', request.url)
    const response = await fetch(accessUrl, {
      headers: {
        cookie: request.headers.get('cookie') ?? '',
      },
      cache: 'no-store',
    })
    return response.ok
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (isPublicPath(pathname)) {
    if (pathname === '/auth/login' && await readSession(request)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  const session = await readSession(request)
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (isSubscriptionPath(pathname)) {
    return NextResponse.next()
  }

  if (!await hasSubscriptionAccess(request)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Assinatura ativa ou trial ativo é obrigatório para acessar este recurso.' }, { status: 402 })
    }
    return NextResponse.redirect(new URL('/assinatura?reason=subscription_required', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|icons|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)'],
}
