import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requireRole } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'

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
})

export async function GET() {
  try {
    await requireAuth()
    const members = await query(
      `select id, full_name, email, role::text as role, crefito, phone, specialty,
              university, semester, is_active, created_at::text, updated_at::text
         from public.users
        where is_active = true
          and role in ('admin', 'mentor', 'intern', 'professional', 'therapist', 'receptionist', 'student')
        order by full_name`
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
    await requireRole(['admin'])
    const body = await request.json()
    const validation = TeamMemberSchema.safeParse({
      ...body,
      email: typeof body?.email === 'string' ? body.email.trim().toLowerCase() : body?.email,
      full_name: typeof body?.full_name === 'string' ? body.full_name.trim() : body?.full_name,
    })

    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 })

    const data = validation.data
    const member = await queryOne(
      `insert into public.users
        (full_name, display_name, email, role, phone, crefito, specialty, university, semester, is_active)
       values
        ($1, $1, $2, $3::public.user_role, $4, $5, $6, $7, $8, $9)
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
      ]
    )
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    const forbidden = error instanceof Error && error.message === 'Permissões insuficientes'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : forbidden ? 'Permissões insuficientes' : 'Erro ao cadastrar membro da equipe.' },
      { status: unauthorized ? 401 : forbidden ? 403 : 500 }
    )
  }
}
