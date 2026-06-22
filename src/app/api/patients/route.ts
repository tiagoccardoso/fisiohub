import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().email('E-mail inválido').optional()
)

const patientSchema = z.object({
  full_name: z.string().min(3, 'Nome completo é obrigatório'),
  birth_date: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().optional()
  ),
  gender: z.string().optional(),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  email: optionalEmail,
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  initial_medical_history: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()

    const patients = search
      ? await query(
          `select id, full_name, email, phone, birth_date::text, created_at::text
             from public.patients
            where status <> 'archived'
              and clinic_id = $1
              and full_name ilike $2
            order by created_at desc
            limit 200`,
          [user.clinic_id, `%${search}%`]
        )
      : await query(
          `select id, full_name, email, phone, birth_date::text, created_at::text
             from public.patients
            where status <> 'archived'
              and clinic_id = $1
            order by created_at desc
            limit 200`,
          [user.clinic_id]
        )

    return NextResponse.json(patients)
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro interno do servidor ao buscar pacientes.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = patientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const data = validation.data
    const newPatient = await queryOne(
      `insert into public.patients
        (full_name, birth_date, gender, cpf, phone, email, address,
         emergency_contact_name, emergency_contact_phone, initial_medical_history, notes, created_by, clinic_id)
       values
        ($1, nullif($2, '')::date, $3, nullif($4, ''), nullif($5, ''), nullif($6, '')::citext, $7,
         $8, $9, $10, $11, $12, $13)
       returning *`,
      [
        data.full_name,
        data.birth_date || '',
        data.gender || null,
        data.cpf || null,
        data.phone || null,
        data.email || null,
        data.address || null,
        data.emergency_contact_name || null,
        data.emergency_contact_phone || null,
        data.initial_medical_history || null,
        data.notes || null,
        user.id,
        user.clinic_id,
      ]
    )

    return NextResponse.json(newPatient, { status: 201 })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    console.error('[patients/post] error', error)
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro interno do servidor ao criar paciente.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
