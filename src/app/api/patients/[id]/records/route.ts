import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'

const recordSchema = z.object({
  content: z.any(),
  session_date: z.string().optional(),
  title: z.string().optional(),
  record_type: z.enum(['evolution', 'evaluation', 'note', 'document', 'prescription']).default('evolution'),
})

function getPatientIdFromRequest(request: NextRequest) {
  const url = new URL(request.url)
  const segments = url.pathname.split('/').filter(Boolean)
  return segments[segments.length - 2]
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const patientId = getPatientIdFromRequest(request)
    if (!patientId) return NextResponse.json({ error: 'ID do paciente não encontrado na URL.' }, { status: 400 })

    const records = await query(
      `select pr.*,
              json_build_object('full_name', u.full_name) as created_by
         from public.patient_records pr
         left join public.users u on u.id = pr.created_by
        where pr.patient_id = $1
          and pr.clinic_id = $2
        order by pr.session_date desc`,
      [patientId, user.clinic_id]
    )

    return NextResponse.json(records)
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao buscar prontuários.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const patientId = getPatientIdFromRequest(request)
    if (!patientId) return NextResponse.json({ error: 'ID do paciente não encontrado na URL.' }, { status: 400 })

    const body = await request.json()
    const validation = recordSchema.safeParse(body)
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 })

    const { content, session_date, title, record_type } = validation.data
    const newRecord = await queryOne(
      `insert into public.patient_records
        (patient_id, created_by, content, session_date, title, record_type, clinic_id)
       select
        p.id, $2, $3::jsonb, coalesce(nullif($4, '')::timestamptz, now()), $5, $6, $7
       from public.patients p
       where p.id = $1 and p.clinic_id = $7
       returning *`,
      [patientId, user.id, JSON.stringify(content ?? {}), session_date || '', title || null, record_type, user.clinic_id]
    )

    if (!newRecord) return NextResponse.json({ error: 'Paciente nao encontrado.' }, { status: 404 })

    return NextResponse.json(newRecord, { status: 201 })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao criar prontuário.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
