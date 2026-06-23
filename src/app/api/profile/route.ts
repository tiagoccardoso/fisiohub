import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSessionCookie } from '@/lib/auth-session'
import { requireAuth } from '@/lib/auth-server'
import { hashPassword, verifyPassword } from '@/lib/password'
import { queryOne } from '@/lib/db-neon'

const ProfileSchema = z.object({
  full_name: z.string().trim().min(3, 'Informe o nome completo.'),
  email: z.string().trim().email('Informe um e-mail valido.'),
  phone: z.string().trim().max(30).optional(),
  crefito: z.string().trim().max(40).optional(),
  specialty: z.string().trim().max(120).optional(),
  university: z.string().trim().max(160).optional(),
  semester: z.union([z.coerce.number().int().min(1).max(20), z.literal(''), z.null()]).optional(),
  avatar_url: z.union([z.string().trim().url('Informe uma URL válida para a foto.'), z.literal('')]).optional(),
  preferences: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'A nova senha deve ter no minimo 8 caracteres.').optional(),
  passwordConfirmation: z.string().optional(),
}).superRefine((data, context) => {
  if (data.newPassword && data.newPassword !== data.passwordConfirmation) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['passwordConfirmation'], message: 'As novas senhas nao conferem.' })
  }
  if (data.newPassword && !data.currentPassword) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['currentPassword'], message: 'Informe a senha atual.' })
  }
})

export async function GET() {
  try {
    const user = await requireAuth()
    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await requireAuth()
    const validation = ProfileSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0]?.message ?? 'Dados invalidos.' }, { status: 400 })
    }

    const data = validation.data
    const current = await queryOne<{ password_hash: string | null }>(
      'select password_hash from public.users where id = $1 and clinic_id = $2 limit 1',
      [sessionUser.id, sessionUser.clinic_id]
    )
    if (!current) return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 })

    const emailChanged = data.email.toLowerCase() !== sessionUser.email.toLowerCase()
    if (emailChanged || data.newPassword) {
      const validPassword = await verifyPassword(data.currentPassword ?? '', current.password_hash)
      if (!validPassword) return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 403 })
    }

    const passwordHash = data.newPassword ? await hashPassword(data.newPassword) : null
    const user = await queryOne<{
      id: string; clinic_id: string; email: string; full_name: string; role: string
    }>(
      `update public.users set
         full_name = $3,
         display_name = $3,
         email = $4::citext,
         phone = nullif($5, ''),
         crefito = nullif($6, ''),
         specialty = nullif($7, ''),
         university = nullif($8, ''),
         semester = nullif($9, '')::integer,
         password_hash = coalesce($10, password_hash),
         avatar_url = nullif($11, ''),
         metadata = coalesce(metadata, '{}'::jsonb) || $12::jsonb,
         updated_at = now()
       where id = $1 and clinic_id = $2
       returning id, clinic_id, email, full_name, role::text as role`,
      [sessionUser.id, sessionUser.clinic_id, data.full_name, data.email.toLowerCase(), data.phone ?? '', data.crefito ?? '', data.specialty ?? '', data.university ?? '', data.semester?.toString() ?? '', passwordHash, data.avatar_url ?? '', JSON.stringify({ preferences: data.preferences || {} })]
    )
    if (!user) return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 })

    await createSessionCookie(user)
    return NextResponse.json({ ok: true, user })
  } catch (error) {
    const duplicateEmail = error instanceof Error && error.message.includes('users_email')
    return NextResponse.json(
      { error: duplicateEmail ? 'Este e-mail ja esta em uso.' : 'Nao foi possivel atualizar o perfil.' },
      { status: duplicateEmail ? 409 : 500 }
    )
  }
}
