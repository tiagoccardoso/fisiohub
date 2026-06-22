import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { execute, queryOne } from '@/lib/db-neon'

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().email('E-mail inválido').optional()
)

const patientUpdateSchema = z.object({
  full_name: z.string().min(3, 'Nome completo é obrigatório').optional(),
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
  status: z.enum(['active', 'inactive', 'archived']).optional(),
})

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
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 })

    const data = validation.data
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
