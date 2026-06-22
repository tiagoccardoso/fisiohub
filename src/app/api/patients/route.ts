import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { patientFormSchema } from '@/lib/patient'

type PostgresError = Error & { code?: string; constraint?: string }

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
    const validation = patientFormSchema.safeParse(body)

    if (!validation.success) {
      const firstIssue = validation.error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.message || 'Dados do paciente inválidos.', fieldErrors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = validation.data
    const existingPatient = await queryOne<{ id: string }>(
      `select id
         from public.patients
        where clinic_id = $1
          and regexp_replace(cpf, '[^0-9]', '', 'g') = $2
        limit 1`,
      [user.clinic_id, data.cpf]
    )

    if (existingPatient) {
      return NextResponse.json({ error: 'CPF já cadastrado nesta clínica.' }, { status: 409 })
    }

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
        data.cpf,
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
    const databaseError = error as PostgresError
    const duplicateCpf = databaseError.code === '23505' && (
      databaseError.constraint === 'patients_clinic_cpf_unique' ||
      databaseError.constraint === 'patients_cpf_key'
    )

    if (duplicateCpf) {
      return NextResponse.json({ error: 'CPF já cadastrado nesta clínica.' }, { status: 409 })
    }

    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro interno do servidor ao criar paciente.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
