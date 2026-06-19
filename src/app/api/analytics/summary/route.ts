import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query } from '@/lib/db-neon'

export async function GET() {
  try {
    await requireAuth()

    const [totalPatientsRows, appointmentsThisMonthRows, newPatientsRows, statusRows, teamRows, trendRows] = await Promise.all([
      query<{ count: string }>('select count(*)::text as count from public.patients where status <> $1', ['archived']),
      query<{ count: string }>(
        `select count(*)::text as count
           from public.calendar_events
          where event_type = 'appointment'
            and start_time >= date_trunc('month', now())`
      ),
      query<{ count: string }>(
        `select count(*)::text as count
           from public.patients
          where created_at >= date_trunc('month', now())
            and status <> 'archived'`
      ),
      query<{ status: string; count: string }>(
        `select coalesce(status::text, 'scheduled') as status, count(*)::text as count
           from public.bookings
          group by coalesce(status::text, 'scheduled')
          order by count(*) desc`
      ),
      query<{ full_name: string; role: string }>(
        `select full_name, role::text as role
           from public.users
          where is_active = true
            and role in ('mentor', 'intern', 'professional', 'therapist', 'admin')
          order by full_name
          limit 10`
      ),
      query<{ month: string; appointments: string; new_patients: string }>(
        `with months as (
           select date_trunc('month', now()) - (interval '1 month' * generate_series(5, 0, -1)) as month_start
         )
         select to_char(month_start, 'Mon') as month,
                coalesce((select count(*) from public.calendar_events ce
                           where ce.event_type = 'appointment'
                             and ce.start_time >= month_start
                             and ce.start_time < month_start + interval '1 month'), 0)::text as appointments,
                coalesce((select count(*) from public.patients p
                           where p.created_at >= month_start
                             and p.created_at < month_start + interval '1 month'
                             and p.status <> 'archived'), 0)::text as new_patients
           from months
          order by month_start`
      ),
    ])

    const appointmentStatusDistribution = statusRows.map((item) => ({
      status: item.status,
      count: Number(item.count),
    }))
    const totalAppointments = appointmentStatusDistribution.reduce((sum, item) => sum + item.count, 0)
    const completedAppointments = appointmentStatusDistribution.find((item) => item.status === 'completed')?.count || 0
    const attendanceRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0

    return NextResponse.json({
      totalPatients: Number(totalPatientsRows[0]?.count ?? 0),
      appointmentsThisMonth: Number(appointmentsThisMonthRows[0]?.count ?? 0),
      newPatientsThisMonth: Number(newPatientsRows[0]?.count ?? 0),
      appointmentStatusDistribution,
      attendanceRate,
      avgSessionDuration: 45,
      teamProductivity: teamRows.map((user) => ({
        professional: user.full_name,
        role: user.role,
        sessions: 0,
      })),
      monthlyTrend: trendRows.map((row) => ({
        month: row.month,
        appointments: Number(row.appointments),
        newPatients: Number(row.new_patients),
      })),
      operationalMetrics: {
        avgSessionDuration: 45,
        scheduleOccupancy: 0,
        cancellationRate: 0,
        sessionsPerProfessionalPerDay: 0,
      },
    })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    console.error('[analytics/summary] error', error)
    return NextResponse.json(
      {
        error: unauthorized ? 'Não autorizado' : 'Erro ao buscar resumo de análises no Neon.',
        totalPatients: 0,
        appointmentsThisMonth: 0,
        newPatientsThisMonth: 0,
        appointmentStatusDistribution: [],
        attendanceRate: 0,
        teamProductivity: [],
        monthlyTrend: [],
      },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
