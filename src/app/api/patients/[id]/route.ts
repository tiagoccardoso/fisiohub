import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { queryOne, withTransaction } from '@/lib/db-neon'
import { patientFormSchema } from '@/lib/patient'
import { assertPatientAccess, getPatientPermissions } from '@/lib/patient-access'

const patientStatusSchema = z.object({ status: z.enum(['active', 'inactive']) }).strict()

type PostgresError = Error & { code?: string; constraint?: string }

function errorResponse(error: unknown, fallback: string) {
  const unauthorized = error instanceof Error && error.message === 'Não autorizado'
  const forbidden = error instanceof Error && error.message === 'Permissões insuficientes'
  return NextResponse.json(
    { error: unauthorized ? 'Não autorizado' : forbidden ? 'Permissões insuficientes' : fallback },
    { status: unauthorized ? 401 : forbidden ? 403 : 500 }
  )
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function getIdFromRequest(request: NextRequest) {
  const url = new URL(request.url)
  return url.pathname.split('/').filter(Boolean).at(-1)
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    assertPatientAccess(user, 'canEdit')
    const id = getIdFromRequest(request)
    if (!id) return NextResponse.json({ error: 'ID do paciente não encontrado na URL.' }, { status: 400 })

    const patient = await queryOne(
      `select * from public.patients
        where id = $1 and clinic_id = $2 and status in ('active', 'inactive')
        limit 1`,
      [id, user.clinic_id]
    )
    if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    return NextResponse.json({ ...patient, permissions: getPatientPermissions(user) })
  } catch (error) {
    return errorResponse(error, 'Erro interno do servidor.')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    assertPatientAccess(user, 'canEdit')
    const id = getIdFromRequest(request)
    if (!id) return NextResponse.json({ error: 'ID do paciente não encontrado na URL.' }, { status: 400 })

    const body = await request.json()
    const isStatusChange = Object.prototype.hasOwnProperty.call(body, 'status')
    if (isStatusChange) assertPatientAccess(user, 'canChangeStatus')
    const validation = isStatusChange ? patientStatusSchema.safeParse(body) : patientFormSchema.safeParse(body)
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.message || 'Dados do paciente inválidos.', fieldErrors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = validation.data
    if ('status' in data) {
      const updatedPatient = await queryOne(
        `update public.patients set status = $2, updated_at = now()
          where id = $1 and clinic_id = $3 and status in ('active', 'inactive')
          returning *`,
        [id, data.status, user.clinic_id]
      )
      if (!updatedPatient) return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
      return NextResponse.json(updatedPatient)
    }

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
          full_name = $2,
          birth_date = $3::date,
          gender = $4,
          cpf = $5,
          phone = $6,
          email = nullif($7, '')::citext,
          address = $8,
          emergency_contact_name = $9,
          emergency_contact_phone = $10,
          initial_medical_history = $11,
          notes = $12,
          updated_at = now()
        where id = $1 and clinic_id = $13 and status in ('active', 'inactive')
        returning *`,
      [
        id,
        data.full_name,
        data.birth_date,
        data.gender || null,
        data.cpf,
        data.phone || null,
        data.email || '',
        data.address || null,
        data.emergency_contact_name || null,
        data.emergency_contact_phone || null,
        data.initial_medical_history || null,
        data.notes || null,
        user.clinic_id,
      ]
    )

    if (!updatedPatient) return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
    return NextResponse.json(updatedPatient)
  } catch (error) {
    const databaseError = error as PostgresError
    const duplicateCpf = databaseError.code === '23505' && (
      databaseError.constraint === 'patients_clinic_cpf_unique' ||
      databaseError.constraint === 'patients_cpf_key'
    )
    if (duplicateCpf) {
      return NextResponse.json({ error: 'CPF já cadastrado nesta clínica.' }, { status: 409 })
    }

    return errorResponse(error, 'Erro ao atualizar paciente.')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    assertPatientAccess(user, 'canDelete')
    const id = getIdFromRequest(request)
    if (!id) return NextResponse.json({ error: 'ID do paciente não encontrado na URL.' }, { status: 400 })

    const result = await withTransaction(async (client) => {
      const patientResult = await client.query<{ id: string }>(
        'select id from public.patients where id = $1 and clinic_id = $2 for update',
        [id, user.clinic_id]
      )
      if (!patientResult.rows[0]) return { kind: 'not-found' as const }

      const referencesResult = await client.query<{ schema_name: string; table_name: string; column_name: string }>(
        `select ns.nspname as schema_name, child.relname as table_name, child_col.attname as column_name
           from pg_constraint fk
           join pg_class child on child.oid = fk.conrelid
           join pg_namespace ns on ns.oid = child.relnamespace
           join unnest(fk.conkey) with ordinality child_keys(attnum, ord) on true
           join unnest(fk.confkey) with ordinality parent_keys(attnum, ord) on parent_keys.ord = child_keys.ord
           join pg_attribute child_col on child_col.attrelid = child.oid and child_col.attnum = child_keys.attnum
           join pg_attribute parent_col on parent_col.attrelid = fk.confrelid and parent_col.attnum = parent_keys.attnum
          where fk.contype = 'f' and fk.confrelid = 'public.patients'::regclass and parent_col.attname = 'id'`
      )

      const linkedTables: string[] = []
      for (const reference of referencesResult.rows) {
        const table = `${quoteIdentifier(reference.schema_name)}.${quoteIdentifier(reference.table_name)}`
        const column = quoteIdentifier(reference.column_name)
        const countResult = await client.query<{ count: string }>(
          `select count(*)::text as count from ${table} where ${column} = $1`,
          [id]
        )
        if (Number(countResult.rows[0]?.count || 0) > 0) linkedTables.push(reference.table_name)
      }

      if (linkedTables.length > 0) return { kind: 'linked' as const, linkedTables: [...new Set(linkedTables)] }
      await client.query('delete from public.patients where id = $1 and clinic_id = $2', [id, user.clinic_id])
      return { kind: 'deleted' as const }
    })

    if (result.kind === 'not-found') return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
    if (result.kind === 'linked') {
      return NextResponse.json({
        error: 'Este paciente possui histórico ou vínculos e não pode ser excluído. Inative o cadastro para preservar os registros.',
        linkedResources: result.linkedTables,
      }, { status: 409 })
    }
    return NextResponse.json({ message: 'Paciente excluído com sucesso.' })
  } catch (error) {
    const databaseError = error as PostgresError
    if (databaseError.code === '23503') {
      return NextResponse.json({ error: 'O paciente possui vínculos e não pode ser excluído. Inative o cadastro.' }, { status: 409 })
    }
    return errorResponse(error, 'Erro ao excluir paciente.')
  }
}
