import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { queryOne, withTransaction } from '@/lib/db-neon'
import { assertExerciseAccess, getExercisePermissions } from '@/lib/exercise-access'
import { exerciseFormSchema } from '@/lib/exercise'

const exerciseSelect = `
  select id,
         name,
         coalesce(description, '') as description,
         category,
         coalesce(anatomical_region, '') as anatomical_region,
         coalesce(video_url, '') as video_url,
         coalesce(difficulty_level, 1) as difficulty_level,
         default_hold_time as duration,
         coalesce(metadata ->> 'muscle_group', '') as muscle_group,
         coalesce(array_to_string(recommended_conditions, ', '), '') as indications,
         coalesce(array_to_string(contraindications, ', '), '') as contraindications,
         is_favorite,
         created_at::text,
         updated_at::text
    from public.exercise_library`

type PostgresError = Error & { code?: string }

function getIdFromRequest(request: NextRequest) {
  return new URL(request.url).pathname.split('/').filter(Boolean).at(-1)
}

function toTextArray(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
}

function errorResponse(error: unknown, fallback: string) {
  const unauthorized = error instanceof Error && error.message === 'Não autorizado'
  const forbidden = error instanceof Error && error.message === 'Permissões insuficientes'
  return NextResponse.json(
    { error: unauthorized ? 'Não autorizado' : forbidden ? 'Permissões insuficientes' : fallback },
    { status: unauthorized ? 401 : forbidden ? 403 : 500 }
  )
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = getIdFromRequest(request)
    if (!id) return NextResponse.json({ error: 'ID do exercício não encontrado.' }, { status: 400 })

    const exercise = await queryOne(
      `${exerciseSelect} where id = $1 and clinic_id = $2 and is_active = true limit 1`,
      [id, user.clinic_id]
    )
    if (!exercise) return NextResponse.json({ error: 'Exercício não encontrado.' }, { status: 404 })

    return NextResponse.json({ ...exercise, permissions: getExercisePermissions(user) })
  } catch (error) {
    return errorResponse(error, 'Erro ao consultar exercício.')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    assertExerciseAccess(user, 'canEdit')
    const id = getIdFromRequest(request)
    if (!id) return NextResponse.json({ error: 'ID do exercício não encontrado.' }, { status: 400 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 })
    }
    const validation = exerciseFormSchema.safeParse(body)
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]
      return NextResponse.json(
        { error: firstIssue?.message || 'Dados do exercício inválidos.', fieldErrors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = validation.data
    const exercise = await queryOne(
      `with updated as (
         update public.exercise_library set
           name = $2,
           description = $3,
           category = $4,
           anatomical_region = $5,
           video_url = nullif($6, ''),
           difficulty_level = $7,
           default_hold_time = $8,
           recommended_conditions = $9::text[],
           contraindications = $10::text[],
           is_favorite = $11,
           metadata = coalesce(metadata, '{}'::jsonb) || $12::jsonb,
           updated_at = now()
         where id = $1 and clinic_id = $13 and is_active = true
         returning *
       )
       ${exerciseSelect.replace('from public.exercise_library', 'from updated')}`,
      [
        id,
        data.name,
        data.description,
        data.category,
        data.anatomical_region,
        data.video_url,
        data.difficulty_level,
        data.duration ?? null,
        toTextArray(data.indications),
        toTextArray(data.contraindications),
        data.is_favorite,
        JSON.stringify({ muscle_group: data.muscle_group }),
        user.clinic_id,
      ]
    )

    if (!exercise) return NextResponse.json({ error: 'Exercício não encontrado.' }, { status: 404 })
    return NextResponse.json(exercise)
  } catch (error) {
    return errorResponse(error, 'Erro ao atualizar exercício.')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    assertExerciseAccess(user, 'canDelete')
    const id = getIdFromRequest(request)
    if (!id) return NextResponse.json({ error: 'ID do exercício não encontrado.' }, { status: 400 })

    const result = await withTransaction(async (client) => {
      const exercise = await client.query<{ id: string }>(
        `select id from public.exercise_library
          where id = $1 and clinic_id = $2 and is_active = true
          for update`,
        [id, user.clinic_id]
      )
      if (!exercise.rows[0]) return { kind: 'not-found' as const }

      const linked = await client.query<{ count: string }>(
        `select count(*)::text as count
           from public.prescription_exercises pe
           join public.exercise_prescriptions ep on ep.id = pe.prescription_id
          where pe.exercise_id = $1 and ep.clinic_id = $2`,
        [id, user.clinic_id]
      )

      if (Number(linked.rows[0]?.count || 0) > 0) {
        await client.query(
          `update public.exercise_library set is_active = false, updated_at = now()
            where id = $1 and clinic_id = $2`,
          [id, user.clinic_id]
        )
        return { kind: 'archived' as const }
      }

      await client.query(
        'delete from public.exercise_library where id = $1 and clinic_id = $2',
        [id, user.clinic_id]
      )
      return { kind: 'deleted' as const }
    })

    if (result.kind === 'not-found') {
      return NextResponse.json({ error: 'Exercício não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      action: result.kind,
      message: result.kind === 'archived'
        ? 'O exercício possui prescrições e foi inativado para preservar o histórico.'
        : 'Exercício excluído com sucesso.',
    })
  } catch (error) {
    const databaseError = error as PostgresError
    if (databaseError.code === '23503') {
      return NextResponse.json(
        { error: 'O exercício possui vínculos e não pode ser excluído.' },
        { status: 409 }
      )
    }
    return errorResponse(error, 'Erro ao excluir exercício.')
  }
}
