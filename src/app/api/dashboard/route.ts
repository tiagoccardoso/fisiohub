import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query } from '@/lib/db-neon'

export async function GET() {
  try {
    const user = await requireAuth()

    const [counts, activities, events] = await Promise.all([
      query<{
        total_notebooks: string
        total_projects: string
        total_tasks: string
        completed_tasks: string
        total_team_members: string
        active_interns: string
        active_mentorships: string
        upcoming_events: string
      }>(
        `select
          (select count(*) from public.notebooks where clinic_id = $1)::text as total_notebooks,
          (select count(*) from public.projects where clinic_id = $1)::text as total_projects,
          (select count(*) from public.tasks where clinic_id = $1)::text as total_tasks,
          (select count(*) from public.tasks where status = 'done' and clinic_id = $1)::text as completed_tasks,
          (select count(*) from public.users where is_active = true and clinic_id = $1)::text as total_team_members,
          (select count(*) from public.users where role = 'intern' and is_active = true and clinic_id = $1)::text as active_interns,
          (select count(*) from public.mentorships where status = 'active' and clinic_id = $1)::text as active_mentorships,
          (select count(*) from public.calendar_events where start_time >= now() and clinic_id = $1)::text as upcoming_events`,
        [user.clinic_id]
      ),
      query(
        `select al.id, al.action, al.resource_type, al.user_id, al.created_at::text,
                json_build_object('full_name', u.full_name, 'avatar_url', u.avatar_url) as user
           from public.activity_logs al
           left join public.users u on u.id = al.user_id
          where al.clinic_id = $1
          order by al.created_at desc
          limit 10`,
        [user.clinic_id]
      ),
      query(
        `select id, title, event_type as type, start_time::text as scheduled_for, attendees as participants
           from public.calendar_events
          where start_time >= now() and clinic_id = $1
          order by start_time asc
          limit 5`,
        [user.clinic_id]
      ),
    ])

    const row = counts[0]
    const totalTasks = Number(row?.total_tasks ?? 0)
    const completedTasks = Number(row?.completed_tasks ?? 0)

    return NextResponse.json({
      stats: {
        totalNotebooks: Number(row?.total_notebooks ?? 0),
        totalProjects: Number(row?.total_projects ?? 0),
        totalTasks,
        completedTasks,
        totalTeamMembers: Number(row?.total_team_members ?? 0),
        activeInterns: Number(row?.active_interns ?? 0),
        upcomingEvents: Number(row?.upcoming_events ?? 0),
        activeMentorships: Number(row?.active_mentorships ?? 0),
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      activities,
      events,
    })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro ao carregar dashboard.' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
