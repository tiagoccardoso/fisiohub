import { cookies } from 'next/headers'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const COOKIE_NAME = 'admin-session'
const MAX_AGE_SECONDS = 60 * 60 * 8

type SessionPayload = { uid: string; email: string; role: string; exp: number; nonce: string }

function getSecret() { return process.env.NEON_AUTH_COOKIE_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || '' }
function sign(payload: string, secret: string) { return createHmac('sha256', secret).update(payload).digest('base64url') }
function encode(payload: SessionPayload, secret: string) { const b = Buffer.from(JSON.stringify(payload)).toString('base64url'); return `${b}.${sign(b, secret)}` }
function decode(token: string, secret: string): SessionPayload | null {
  const [b, s] = token.split('.')
  if (!b || !s) return null

  const expectedSig = sign(b, secret)
  const sigBuffer = Buffer.from(s)
  const expectedBuffer = Buffer.from(expectedSig)
  if (sigBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null

  try {
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8')) as SessionPayload
    if (!payload?.uid || !payload?.exp || Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export async function createSessionCookie(user: {id:string;email:string;role:string}) { const secret=getSecret(); if(!secret) throw new Error('secret ausente'); const payload:SessionPayload={uid:user.id,email:user.email,role:user.role,exp:Date.now()+MAX_AGE_SECONDS*1000,nonce:randomBytes(8).toString('hex')}; (await cookies()).set(COOKIE_NAME,encode(payload,secret),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:MAX_AGE_SECONDS}) }
export async function clearSessionCookie() { (await cookies()).set(COOKIE_NAME,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0}) }
export async function getSessionFromCookie() { const s=getSecret(); if(!s) return null; const t=(await cookies()).get(COOKIE_NAME)?.value; if(!t) return null; return decode(t,s)}
