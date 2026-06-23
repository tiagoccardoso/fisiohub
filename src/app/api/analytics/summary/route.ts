import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { apiError } from '@/lib/tenant-api'

export async function GET() {
  try {
    const user = await requireAuth()
    const clinicId = user.clinic_id
    const [counts, statuses, team, trend, operational] = await Promise.all([
      queryOne<{ total: string; appointments: string; new_patients: string; previous_new_patients: string; previous_appointments: string }>(
        `select
          (select count(*) from public.patients where clinic_id = $1 and status <> 'archived')::text as total,
          (select count(*) from public.calendar_events where clinic_id = $1 and start_time >= date_trunc('month', now())
            and event_type in ('appointment','evaluation','return','session'))::text as appointments,
          (select count(*) from public.patients where clinic_id = $1 and status <> 'archived' and created_at >= date_trunc('month', now()))::text as new_patients,
          (select count(*) from public.patients where clinic_id = $1 and status <> 'archived'
            and created_at >= date_trunc('month', now()) - interval '1 month' and created_at < date_trunc('month', now()))::text as previous_new_patients,
          (select count(*) from public.calendar_events where clinic_id = $1
            and start_time >= date_trunc('month', now()) - interval '1 month' and start_time < date_trunc('month', now())
            and event_type in ('appointment','evaluation','return','session'))::text as previous_appointments`, [clinicId]),
      query<{ status: string; count: string }>(
        `select status, count(*)::text as count from public.calendar_events
          where clinic_id = $1 and event_type in ('appointment','evaluation','return','session')
          group by status order by count(*) desc`, [clinicId]),
      query<{ professional: string; role: string; sessions: string }>(
        `select u.full_name as professional, u.role::text as role,
                count(e.id) filter (where e.status = 'completed')::text as sessions
           from public.users u left join public.calendar_events e
             on e.clinic_id = u.clinic_id and coalesce(e.professional_id, e.created_by) = u.id
            and e.start_time >= date_trunc('month', now())
          where u.clinic_id = $1 and u.is_active = true
            and u.role in ('admin','mentor','professional','therapist')
          group by u.id, u.full_name, u.role order by count(e.id) desc, u.full_name limit 20`, [clinicId]),
      query<{ month: string; appointments: string; new_patients: string }>(
        `with months as (select generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m)
         select to_char(m, 'MM/YYYY') as month,
          (select count(*) from public.calendar_events e where e.clinic_id = $1 and e.start_time >= m and e.start_time < m + interval '1 month'
            and e.event_type in ('appointment','evaluation','return','session'))::text as appointments,
          (select count(*) from public.patients p where p.clinic_id = $1 and p.created_at >= m and p.created_at < m + interval '1 month'
            and p.status <> 'archived')::text as new_patients from months order by m`, [clinicId]),
      queryOne<{ avg_duration: string | null; total: string; cancelled: string; professional_days: string; completed: string }>(
        `select round(avg(extract(epoch from (end_time - start_time)) / 60) filter (where status = 'completed'), 1)::text as avg_duration,
          count(*)::text as total, count(*) filter (where status = 'cancelled')::text as cancelled,
          count(distinct (coalesce(professional_id, created_by)::text || ':' || start_time::date::text))::text as professional_days,
          count(*) filter (where status = 'completed')::text as completed
         from public.calendar_events where clinic_id = $1 and start_time >= date_trunc('month', now())
           and event_type in ('appointment','evaluation','return','session')`, [clinicId]),
    ])
    const total = statuses.reduce((sum, row) => sum + Number(row.count), 0)
    const completed = statuses.find((row) => row.status === 'completed')?.count || '0'
    const monthTotal = Number(operational?.total || 0)
    const professionalDays = Number(operational?.professional_days || 0)
    return NextResponse.json({
      totalPatients: Number(counts?.total || 0), appointmentsThisMonth: Number(counts?.appointments || 0),
      newPatientsThisMonth: Number(counts?.new_patients || 0), previousAppointments: Number(counts?.previous_appointments || 0),
      previousNewPatients: Number(counts?.previous_new_patients || 0),
      appointmentStatusDistribution: statuses.map((row) => ({ status: row.status, count: Number(row.count) })),
      attendanceRate: total ? Math.round(Number(completed) / total * 100) : 0,
      avgSessionDuration: operational?.avg_duration ? Number(operational.avg_duration) : null,
      teamProductivity: team.map((row) => ({ ...row, sessions: Number(row.sessions) })),
      monthlyTrend: trend.map((row) => ({ month: row.month, appointments: Number(row.appointments), newPatients: Number(row.new_patients) })),
      operationalMetrics: {
        avgSessionDuration: operational?.avg_duration ? Number(operational.avg_duration) : null,
        cancellationRate: monthTotal ? Math.round(Number(operational?.cancelled || 0) / monthTotal * 100) : 0,
        sessionsPerProfessionalPerDay: professionalDays ? Number((Number(operational?.completed || 0) / professionalDays).toFixed(1)) : 0,
      },
    })
  } catch (error) { return apiError(error, 'Erro ao buscar análises no Neon.') }
}
