import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { queryOne } from '@/lib/db-neon'

const CompetencySchema = z.object({
  mentorship_id: z.string().uuid(),
  competency_id: z.string().uuid().optional(),
  competency: z.string().min(1),
  level: z.coerce.number().int().min(1).max(5),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = CompetencySchema.safeParse(body)
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 })

    const data = validation.data
    const competency = data.competency_id
      ? await queryOne(
          `update public.competency_evaluations set
              competency = $2,
              level = $3,
              notes = $4,
              evaluated_by = $5,
              updated_at = now()
            where id = $1 and clinic_id = $6
            returning id, competency, level, evaluation_date::text, notes`,
          [data.competency_id, data.competency, data.level, data.notes || null, user.id, user.clinic_id]
        )
      : await queryOne(
          `insert into public.competency_evaluations
            (mentorship_id, competency, level, notes, evaluated_by, clinic_id)
           values
            ($1, $2, $3, $4, $5, $6)
           returning id, competency, level, evaluation_date::text, notes`,
          [data.mentorship_id, data.competency, data.level, data.notes || null, user.id, user.clinic_id]
        )

    if (!competency) return NextResponse.json({ error: 'Mentoria ou competencia nao encontrada.' }, { status: 404 })

    return NextResponse.json(competency, { status: data.competency_id ? 200 : 201 })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao salvar competência.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
