import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query } from '@/lib/db-neon'

export async function GET() {
  try {
    const user = await requireAuth()
    const mentorships = await query(
      `select m.id,
              m.mentor_id,
              coalesce(m.intern_id, m.mentee_id) as intern_id,
              m.status::text as status,
              m.start_date::text,
              m.end_date::text,
              m.hours_completed,
              m.hours_required,
              m.goals,
              coalesce(competencies.items, '[]'::json) as competencies,
              coalesce(notes.items, '[]'::json) as notes,
              m.created_at::text,
              row_to_json(mentor.*) as mentor,
              row_to_json(intern.*) as intern
         from public.mentorships m
         left join public.users mentor on mentor.id = m.mentor_id
         left join public.users intern on intern.id = coalesce(m.intern_id, m.mentee_id)
         left join lateral (
           select json_agg(ce order by ce.evaluation_date desc) as items
             from public.competency_evaluations ce
            where ce.mentorship_id = m.id and ce.clinic_id = $1
         ) competencies on true
         left join lateral (
           select json_agg(pn order by pn.date desc) as items
             from public.progress_notes pn
            where pn.mentorship_id = m.id and pn.clinic_id = $1
         ) notes on true
        where m.clinic_id = $1
        order by m.created_at desc`,
      [user.clinic_id]
    )

    return NextResponse.json(mentorships)
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao carregar mentorias.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
