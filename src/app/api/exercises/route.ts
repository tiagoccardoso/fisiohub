import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
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

export async function GET() {
  try {
    const user = await requireAuth()
    const exercises = await query(
      `${exerciseSelect}
        where clinic_id = $1 and is_active = true
        order by name asc, id asc
        limit 500`,
      [user.clinic_id]
    )

    return NextResponse.json({
      items: exercises,
      permissions: getExercisePermissions(user),
    })
  } catch (error) {
    return errorResponse(error, 'Erro ao buscar exercícios.')
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    assertExerciseAccess(user, 'canCreate')
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
      `with inserted as (
         insert into public.exercise_library
           (name, description, category, anatomical_region, video_url, difficulty_level,
            default_hold_time, recommended_conditions, contraindications, is_favorite,
            created_by, clinic_id, metadata)
         values ($1, $2, $3, $4, nullif($5, ''), $6, $7, $8::text[], $9::text[], $10, $11, $12, $13::jsonb)
         returning *
       )
       ${exerciseSelect.replace('from public.exercise_library', 'from inserted')}`,
      [
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
        user.id,
        user.clinic_id,
        JSON.stringify({ muscle_group: data.muscle_group }),
      ]
    )

    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Erro ao cadastrar exercício.')
  }
}
