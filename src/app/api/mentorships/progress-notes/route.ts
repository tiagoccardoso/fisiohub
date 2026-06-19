import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { queryOne } from '@/lib/db-neon'

const ProgressNoteSchema = z.object({
  mentorship_id: z.string().uuid(),
  content: z.string().min(1),
  achievements: z.array(z.string()).default([]),
  next_steps: z.array(z.string()).default([]),
  feedback_type: z.enum(['positive', 'improvement', 'neutral']).default('neutral'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = ProgressNoteSchema.safeParse(body)
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 })

    const data = validation.data
    const note = await queryOne(
      `insert into public.progress_notes
        (mentorship_id, content, achievements, next_steps, feedback_type, created_by)
       values
        ($1, $2, $3::text[], $4::text[], $5::public.feedback_type, $6)
       returning id, date::text, content, achievements, next_steps, feedback_type::text, created_by`,
      [data.mentorship_id, data.content, data.achievements, data.next_steps, data.feedback_type, user.id]
    )

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao adicionar nota de progresso.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
