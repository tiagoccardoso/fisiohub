import { z } from 'zod'
import { queryOne } from '@/lib/db-neon'

export const eventSchema = z.object({
  title: z.string().trim().min(2, 'Informe o título do evento.').max(180), description: z.string().trim().max(3000).optional().nullable(),
  start_time: z.string().datetime({ offset: true }).or(z.string().min(16)), end_time: z.string().datetime({ offset: true }).or(z.string().min(16)),
  event_type: z.enum(['appointment', 'evaluation', 'return', 'session', 'supervision', 'meeting', 'break', 'blocked']).default('appointment'),
  status: z.enum(['pending', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']).optional(),
  location: z.string().trim().max(300).optional().nullable(), attendees: z.array(z.string().uuid()).max(100).optional().default([]),
  patient_id: z.string().uuid().optional().nullable(), professional_id: z.string().uuid().optional().nullable(),
}).refine((value) => new Date(value.end_time) > new Date(value.start_time), { path: ['end_time'], message: 'O término deve ser posterior ao início.' })

export const eventSelect = `select e.id, e.title, e.description, e.start_time::text, e.end_time::text,
       e.event_type, e.status, e.location, e.attendees, e.patient_id, e.professional_id,
       e.created_by, e.created_at::text, e.updated_at::text,
       json_build_object('full_name', u.full_name, 'email', u.email) as creator
  from public.calendar_events e left join public.users u on u.id = e.created_by and u.clinic_id = e.clinic_id`

export async function validEventReferences(clinicId: string, attendees: string[], patientId?: string | null, professionalId?: string | null) {
  const row = await queryOne<{ users_ok: boolean; patient_ok: boolean }>(
    `select not exists (select 1 from unnest($2::uuid[]) id where not exists (select 1 from public.users u where u.id = id and u.clinic_id = $1 and u.is_active = true))
      and ($4::uuid is null or exists (select 1 from public.users where id = $4 and clinic_id = $1 and is_active = true)) as users_ok,
      ($3::uuid is null or exists (select 1 from public.patients where id = $3 and clinic_id = $1 and status <> 'archived')) as patient_ok`,
    [clinicId, attendees, patientId || null, professionalId || null])
  return Boolean(row?.users_ok && row?.patient_ok)
}
