import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { apiError, logActivity } from '@/lib/tenant-api'
import { eventSchema, eventSelect, validEventReferences } from '@/lib/calendar-management'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const params = new URL(request.url).searchParams
    const start = params.get('start') || ''
    const end = params.get('end') || ''
    const events = await query(
      `${eventSelect} where e.clinic_id = $1
        and ($2 = '' or e.end_time >= $2::timestamptz)
        and ($3 = '' or e.start_time <= $3::timestamptz)
        order by e.start_time asc limit 500`,
      [user.clinic_id, start, end]
    )
    return NextResponse.json(events)
  } catch (error) { return apiError(error, 'Erro ao carregar eventos.') }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const validation = eventSchema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message, fieldErrors: validation.error.flatten().fieldErrors }, { status: 400 })
    const d = validation.data
    if (!await validEventReferences(user.clinic_id, d.attendees, d.patient_id, d.professional_id)) {
      return NextResponse.json({ error: 'Paciente, profissional ou participante inválido para esta clínica.' }, { status: 400 })
    }
    const event = await queryOne(
      `with inserted as (
        insert into public.calendar_events
          (title, description, start_time, end_time, event_type, status, location, attendees, patient_id, professional_id, created_by, clinic_id)
        values ($1, nullif($2, ''), $3::timestamptz, $4::timestamptz, $5, coalesce($6, 'scheduled'), nullif($7, ''),
                $8::uuid[], $9, coalesce($10, $11), $11, $12) returning *
       ) ${eventSelect.replace('from public.calendar_events e', 'from inserted e')}`,
      [d.title, d.description || '', d.start_time, d.end_time, d.event_type, d.status, d.location || '', d.attendees, d.patient_id || null, d.professional_id || null, user.id, user.clinic_id]
    )
    await logActivity(user, 'create', 'calendar_event', (event as { id?: string } | null)?.id)
    return NextResponse.json(event, { status: 201 })
  } catch (error) { return apiError(error, 'Erro ao criar evento.') }
}
