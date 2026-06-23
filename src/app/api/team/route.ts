import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireRole } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { hashPassword } from '@/lib/password'

const TeamMemberSchema = z.object({
  full_name: z.string().min(3),
  email: z.string().email(),
  role: z.enum(['admin', 'mentor', 'intern', 'guest', 'professional', 'therapist', 'receptionist', 'student']).default('professional'),
  phone: z.string().optional(),
  crefito: z.string().optional(),
  specialty: z.string().optional(),
  university: z.string().optional(),
  semester: z.coerce.number().int().min(1).max(20).optional(),
  is_active: z.boolean().default(true),
  temporary_password: z.string().min(8, 'A senha temporária deve ter ao menos 8 caracteres.'),
})

export async function GET() {
  try {
    const user = await requireAuth()
    const members = await query(
      `select id, full_name, email, role::text as role, crefito, phone, specialty,
              university, semester, is_active, created_at::text, updated_at::text
         from public.users
        where clinic_id = $1
          and role in ('admin', 'mentor', 'intern', 'professional', 'therapist', 'receptionist', 'student')
        order by full_name`,
      [user.clinic_id]
    )
    return NextResponse.json(members)
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao carregar equipe.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(['admin'])
    const body = await request.json()
    const validation = TeamMemberSchema.safeParse({
      ...body,
      email: typeof body?.email === 'string' ? body.email.trim().toLowerCase() : body?.email,
      full_name: typeof body?.full_name === 'string' ? body.full_name.trim() : body?.full_name,
    })

    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 })

    const data = validation.data
    const passwordHash = data.temporary_password ? await hashPassword(data.temporary_password) : null
    const member = await queryOne(
      `insert into public.users
        (full_name, display_name, email, role, phone, crefito, specialty, university, semester, is_active, clinic_id, password_hash)
       values
        ($1, $1, $2, $3::public.user_role, $4, $5, $6, $7, $8, $9, $10, $11)
       returning id, full_name, email, role::text as role, crefito, phone, specialty, university, semester, is_active, created_at::text, updated_at::text`,
      [
        data.full_name,
        data.email,
        data.role,
        data.phone || null,
        data.crefito || null,
        data.specialty || null,
        data.university || null,
        data.semester || null,
        data.is_active,
        user.clinic_id,
        passwordHash,
      ]
    )
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    const forbidden = error instanceof Error && error.message === 'Permissões insuficientes'
    const duplicate = (error as { code?: string })?.code === '23505'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : forbidden ? 'Permissões insuficientes' : duplicate ? 'Este e-mail já está cadastrado.' : 'Erro ao cadastrar membro da equipe.' },
      { status: unauthorized ? 401 : forbidden ? 403 : duplicate ? 409 : 500 }
    )
  }
}
