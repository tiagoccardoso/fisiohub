import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { execute, queryOne } from '@/lib/db-neon'
import { patientFormSchema } from '@/lib/patient'

const patientUpdateSchema = patientFormSchema.partial().extend({
  status: z.enum(['active', 'inactive', 'archived']).optional(),
})

type PostgresError = Error & { code?: string; constraint?: string }

function getIdFromRequest(request: NextRequest) {
  const url = new URL(request.url)
  return url.pathname.split('/').filter(Boolean).at(-1)
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = getIdFromRequest(request)
    if (!id) return NextResponse.json({ error: 'ID do paciente não encontrado na URL.' }, { status: 400 })

    const patient = await queryOne('select * from public.patients where id = $1 and clinic_id = $2 limit 1', [id, user.clinic_id])
    if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    return NextResponse.json(patient)
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro interno do servidor.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = getIdFromRequest(request)
    if (!id) return NextResponse.json({ error: 'ID do paciente não encontrado na URL.' }, { status: 400 })

    const body = await request.json()
    const validation = patientUpdateSchema.safeParse(body)
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.message || 'Dados do paciente inválidos.', fieldErrors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = validation.data
    if (data.cpf) {
      const existingPatient = await queryOne<{ id: string }>(
        `select id
           from public.patients
          where clinic_id = $1
            and id <> $2
            and regexp_replace(cpf, '[^0-9]', '', 'g') = $3
          limit 1`,
        [user.clinic_id, id, data.cpf]
      )
      if (existingPatient) {
        return NextResponse.json({ error: 'CPF já cadastrado nesta clínica.' }, { status: 409 })
      }
    }

    const updatedPatient = await queryOne(
      `update public.patients set
          full_name = coalesce($2, full_name),
          birth_date = coalesce(nullif($3, '')::date, birth_date),
          gender = coalesce($4, gender),
          cpf = coalesce(nullif($5, ''), cpf),
          phone = coalesce(nullif($6, ''), phone),
          email = coalesce(nullif($7, '')::citext, email),
          address = coalesce($8, address),
          emergency_contact_name = coalesce($9, emergency_contact_name),
          emergency_contact_phone = coalesce($10, emergency_contact_phone),
          initial_medical_history = coalesce($11, initial_medical_history),
          notes = coalesce($12, notes),
          status = coalesce($13, status),
          updated_at = now()
        where id = $1 and clinic_id = $14
        returning *`,
      [
        id,
        data.full_name ?? null,
        data.birth_date ?? '',
        data.gender ?? null,
        data.cpf ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.address ?? null,
        data.emergency_contact_name ?? null,
        data.emergency_contact_phone ?? null,
        data.initial_medical_history ?? null,
        data.notes ?? null,
        data.status ?? null,
        user.clinic_id,
      ]
    )

    if (!updatedPatient) return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
    return NextResponse.json(updatedPatient)
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
      { error: unauthorized ? 'Não autorizado' : 'Erro ao atualizar paciente.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = getIdFromRequest(request)
    if (!id) return NextResponse.json({ error: 'ID do paciente não encontrado na URL.' }, { status: 400 })

    const result = await execute('update public.patients set status = $2, updated_at = now() where id = $1 and clinic_id = $3', [id, 'archived', user.clinic_id])
    if (result.rowCount === 0) return NextResponse.json({ error: 'Paciente nao encontrado.' }, { status: 404 })
    return NextResponse.json({ message: 'Paciente arquivado com sucesso' })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao deletar paciente.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
