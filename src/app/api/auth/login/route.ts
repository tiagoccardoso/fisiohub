import { NextResponse } from 'next/server'
import { createSessionCookie } from '@/lib/auth-session'
import { queryOne, execute } from '@/lib/db-neon'
import { verifyPassword } from '@/lib/password'

type LoginUser = {
  id: string
  clinic_id: string
  clinic_name: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  password_hash: string | null
}

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}))
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const normalizedPassword = typeof password === 'string' ? password : ''

  if (!normalizedEmail || !normalizedPassword) {
    return NextResponse.json({ error: 'Preencha e-mail e senha.' }, { status: 400 })
  }

  if (!process.env.DATABASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
    return NextResponse.json(
      { error: 'Login indisponível: configure DATABASE_URL e NEON_AUTH_COOKIE_SECRET no servidor.' },
      { status: 500 }
    )
  }

  try {
    const user = await queryOne<LoginUser>(
      `select u.id, u.clinic_id, c.name as clinic_name, u.email, u.full_name, u.role, u.is_active, u.password_hash
         from public.users u
         join public.clinics c on c.id = u.clinic_id and c.is_active = true
        where lower(u.email::text) = lower($1)
        limit 1`,
      [normalizedEmail]
    )

    if (!user) {
      return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Usuário inativo. Entre em contato com o administrador.' }, { status: 403 })
    }

    const passwordMatches = await verifyPassword(normalizedPassword, user.password_hash)
    if (!passwordMatches) {
      return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 })
    }

    await execute('update public.users set last_login = now(), updated_at = now() where id = $1', [user.id])
    await createSessionCookie({ id: user.id, email: user.email, role: user.role })

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        clinic_id: user.clinic_id,
        clinic_name: user.clinic_name,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    })
  } catch (error) {
    console.error('[auth/login] database_error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    return NextResponse.json(
      { error: 'Não foi possível autenticar no banco Neon no momento.' },
      { status: 500 }
    )
  }
}
