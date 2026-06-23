import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { execute, queryOne } from '@/lib/db-neon'
import { apiError, getIdFromRequest, isManager, logActivity } from '@/lib/tenant-api'
import { eventSchema, eventSelect, validEventReferences } from '@/lib/calendar-management'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const event = await queryOne(`${eventSelect} where e.id = $1 and e.clinic_id = $2`, [getIdFromRequest(request), user.clinic_id])
    if (!event) return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 })
    return NextResponse.json(event)
  } catch (error) { return apiError(error, 'Erro ao consultar evento.') }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = getIdFromRequest(request)
    const validation = eventSchema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message, fieldErrors: validation.error.flatten().fieldErrors }, { status: 400 })
    const d = validation.data
    if (!await validEventReferences(user.clinic_id, d.attendees, d.patient_id, d.professional_id)) return NextResponse.json({ error: 'Referência inválida para esta clínica.' }, { status: 400 })
    const event = await queryOne(
      `update public.calendar_events set title = $4, description = nullif($5, ''), start_time = $6::timestamptz,
         end_time = $7::timestamptz, event_type = $8, status = coalesce($9, status), location = nullif($10, ''),
         attendees = $11::uuid[], patient_id = $12, professional_id = $13, updated_at = now()
       where id = $1 and clinic_id = $2 and ($3 = true or created_by = $14) returning id`,
      [id, user.clinic_id, isManager(user), d.title, d.description || '', d.start_time, d.end_time, d.event_type, d.status, d.location || '', d.attendees, d.patient_id || null, d.professional_id || null, user.id]
    )
    if (!event) return NextResponse.json({ error: 'Evento não encontrado ou sem permissão.' }, { status: 404 })
    await logActivity(user, 'update', 'calendar_event', id)
    return NextResponse.json(await queryOne(`${eventSelect} where e.id = $1 and e.clinic_id = $2`, [id, user.clinic_id]))
  } catch (error) { return apiError(error, 'Erro ao atualizar evento.') }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = getIdFromRequest(request)
    const result = await execute('delete from public.calendar_events where id = $1 and clinic_id = $2 and ($3 = true or created_by = $4)', [id, user.clinic_id, isManager(user), user.id])
    if (!result.rowCount) return NextResponse.json({ error: 'Evento não encontrado ou sem permissão.' }, { status: 404 })
    await logActivity(user, 'delete', 'calendar_event', id)
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error, 'Erro ao excluir evento.') }
}
