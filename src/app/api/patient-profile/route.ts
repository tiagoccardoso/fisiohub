import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne, withTransaction } from '@/lib/db-neon'
import { patientProfileSchema } from '@/lib/patient-profile'
import { assertPatientAccess } from '@/lib/patient-access'

const patientIdSchema = patientProfileSchema.shape.patientId

function isUnauthorized(error: unknown) {
  return error instanceof Error && error.message === 'Não autorizado'
}

function isForbidden(error: unknown) {
  return error instanceof Error && error.message === 'Permissões insuficientes'
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    assertPatientAccess(user, 'canEdit')
    const validation = patientIdSchema.safeParse(request.nextUrl.searchParams.get('patientId'))

    if (!validation.success) {
      return NextResponse.json({ error: 'Selecione um paciente válido.' }, { status: 400 })
    }

    const patient = await queryOne<{ id: string; full_name: string; birth_date: string | null }>(
      `select id, full_name, birth_date::text
         from public.patients
        where id = $1 and clinic_id = $2 and status <> 'archived'
        limit 1`,
      [validation.data, user.clinic_id]
    )

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
    }

    const current = await queryOne(
      `select pp.*, u.full_name as responsible_user_name
         from public.patient_profiles pp
         left join public.users u on u.id = pp.updated_by and u.clinic_id = pp.clinic_id
        where pp.patient_id = $1 and pp.clinic_id = $2
        limit 1`,
      [patient.id, user.clinic_id]
    )

    const history = await query(
      `select pph.*, u.full_name as responsible_user_name
         from public.patient_profile_history pph
         left join public.users u on u.id = pph.created_by and u.clinic_id = pph.clinic_id
        where pph.patient_id = $1 and pph.clinic_id = $2
        order by pph.created_at desc, pph.id desc`,
      [patient.id, user.clinic_id]
    )

    return NextResponse.json({ patient, current, history })
  } catch (error) {
    return NextResponse.json(
      { error: isUnauthorized(error) ? 'Não autorizado' : isForbidden(error) ? 'Permissões insuficientes' : 'Erro ao carregar o perfil do paciente.' },
      { status: isUnauthorized(error) ? 401 : isForbidden(error) ? 403 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    assertPatientAccess(user, 'canEdit')
    const validation = patientProfileSchema.safeParse(await request.json())

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Revise os dados informados.', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = validation.data
    const result = await withTransaction(async (client) => {
      const patientResult = await client.query<{ id: string }>(
        `select id
           from public.patients
          where id = $1 and clinic_id = $2 and status <> 'archived'
          for update`,
        [data.patientId, user.clinic_id]
      )

      if (!patientResult.rows[0]) return null

      const currentResult = await client.query(
        `insert into public.patient_profiles
          (patient_id, clinic_id, age, condition, severity, pain_level, lifestyle, updated_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (patient_id) do update set
           age = excluded.age,
           condition = excluded.condition,
           severity = excluded.severity,
           pain_level = excluded.pain_level,
           lifestyle = excluded.lifestyle,
           updated_by = excluded.updated_by,
           updated_at = now()
         where patient_profiles.clinic_id = excluded.clinic_id
         returning *`,
        [data.patientId, user.clinic_id, data.age, data.condition, data.severity, data.painLevel, data.lifestyle, user.id]
      )

      const historyResult = await client.query(
        `insert into public.patient_profile_history
          (patient_id, clinic_id, age, condition, severity, pain_level, lifestyle, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning *`,
        [data.patientId, user.clinic_id, data.age, data.condition, data.severity, data.painLevel, data.lifestyle, user.id]
      )

      return { current: currentResult.rows[0], historyEntry: historyResult.rows[0] }
    })

    if (!result) {
      return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: isUnauthorized(error) ? 'Não autorizado' : isForbidden(error) ? 'Permissões insuficientes' : 'Erro ao salvar o perfil do paciente.' },
      { status: isUnauthorized(error) ? 401 : isForbidden(error) ? 403 : 500 }
    )
  }
}
