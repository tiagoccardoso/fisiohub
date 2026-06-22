import { NextResponse } from 'next/server'
import { z } from 'zod'
import { hashPassword } from '@/lib/password'
import { queryOne, withTransaction } from '@/lib/db-neon'

type UserRole = 'admin' | 'mentor' | 'intern' | 'guest' | 'professional' | 'therapist' | 'receptionist' | 'patient' | 'student'

const SignupSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.'),
  passwordConfirmation: z.string().min(1, 'Confirme a senha.'),
  fullName: z.string().min(3, 'Informe o nome completo.'),
  role: z.enum(['admin', 'mentor', 'intern', 'guest', 'professional', 'therapist', 'receptionist', 'patient', 'student']).default('admin'),
  phone: z.string().optional(),
  crefito: z.string().optional(),
  specialty: z.string().optional(),
  university: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(20).optional(),
  clinicName: z.string().trim().min(3, 'Informe o nome da clínica.'),
  clinicDocument: z.string().trim().min(11, 'Informe um CPF ou CNPJ válido.').max(18),
  clinicPhone: z.string().trim().min(8, 'Informe o telefone da clínica.'),
  clinicEmail: z.string().email('Informe um e-mail válido para a clínica.'),
  clinicAddress: z.string().trim().min(5, 'Informe o endereço da clínica.'),
})

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getMissingServerEnv() {
  return ['DATABASE_URL', 'NEON_AUTH_COOKIE_SECRET'].filter((name) => !process.env[name])
}

export async function POST(request: Request) {
  const missingEnv = getMissingServerEnv()
  if (missingEnv.length > 0) {
    console.error('[auth/signup] missing_server_env', { missing: missingEnv })
    return NextResponse.json(
      {
        error: 'Cadastro indisponível no momento: configure DATABASE_URL e NEON_AUTH_COOKIE_SECRET no servidor.',
        code: 'missing_server_env',
      },
      { status: 500 }
    )
  }

  let parsed: z.infer<typeof SignupSchema>
  try {
    const body = await request.json()
    const validation = SignupSchema.safeParse({
      ...body,
      email: typeof body?.email === 'string' ? body.email.trim().toLowerCase() : body?.email,
      fullName: typeof body?.fullName === 'string' ? body.fullName.trim() : body?.fullName,
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.errors[0]?.message ?? 'Dados inválidos para cadastro.',
          code: 'validation_error',
          details: validation.error.format(),
        },
        { status: 400 }
      )
    }

    parsed = validation.data
  } catch {
    return NextResponse.json({ error: 'Payload inválido.', code: 'invalid_payload' }, { status: 400 })
  }

  if (parsed.password !== parsed.passwordConfirmation) {
    return NextResponse.json({ error: 'As senhas não conferem.', code: 'password_mismatch' }, { status: 400 })
  }

  try {
    const existingUser = await queryOne<{ id: string }>(
      'select id from public.users where lower(email::text) = lower($1) limit 1',
      [parsed.email]
    )

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.', code: 'duplicate_user' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(parsed.password)
    const user = await withTransaction(async (client) => {
      const baseSlug = slugify(parsed.clinicName) || 'clinica'
      const clinicResult = await client.query<{ id: string }>(
        `insert into public.clinics (name, slug, document_number, phone, email, address)
         values ($1, $2 || '-' || substr(gen_random_uuid()::text, 1, 8), nullif($3, ''), $4, $5::citext, $6)
         returning id`,
        [parsed.clinicName, baseSlug, parsed.clinicDocument, parsed.clinicPhone, parsed.clinicEmail.toLowerCase(), parsed.clinicAddress]
      )
      const clinic = clinicResult.rows[0]
      if (!clinic) throw new Error('clinic_creation_failed')

      const userResult = await client.query<{
      id: string
      email: string
      full_name: string
      role: UserRole
      is_active: boolean
      created_at: string
      }>(
      `insert into public.users
        (clinic_id, email, full_name, display_name, role, phone, crefito, specialty, university, semester, password_hash, is_active)
       values
        ($1, $2, $3, $3, 'admin'::public.user_role, $4, $5, $6, $7, $8, $9, true)
       returning id, email, full_name, role, is_active, created_at::text`,
      [
        clinic.id,
        parsed.email,
        parsed.fullName,
        parsed.phone || null,
        parsed.crefito || null,
        parsed.specialty || null,
        parsed.university || null,
        parsed.semester || null,
        passwordHash,
      ]
      )
      return userResult.rows[0] ?? null
    })

    return NextResponse.json({ ok: true, user }, { status: 201 })
  } catch (error) {
    console.error('[auth/signup] database_error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    return NextResponse.json(
      {
        error: 'Não foi possível concluir o cadastro no banco Neon. Verifique se o schema foi aplicado.',
        code: 'database_error',
      },
      { status: 500 }
    )
  }
}
