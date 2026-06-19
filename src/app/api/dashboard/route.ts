import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query } from '@/lib/db-neon'

export async function GET() {
  try {
    await requireAuth()

    const [counts, activities, events] = await Promise.all([
      query<{
        total_notebooks: string
        total_projects: string
        total_tasks: string
        completed_tasks: string
        total_team_members: string
        active_interns: string
        active_mentorships: string
      }>(
        `select
          (select count(*) from public.notebooks)::text as total_notebooks,
          (select count(*) from public.projects)::text as total_projects,
          (select count(*) from public.tasks)::text as total_tasks,
          (select count(*) from public.tasks where status = 'done')::text as completed_tasks,
          (select count(*) from public.users where is_active = true)::text as total_team_members,
          (select count(*) from public.users where role = 'intern' and is_active = true)::text as active_interns,
          (select count(*) from public.mentorships where status = 'active')::text as active_mentorships`
      ),
      query(
        `select al.id, al.action, al.resource_type, al.user_id, al.created_at::text,
                json_build_object('full_name', u.full_name, 'avatar_url', u.avatar_url) as user
           from public.activity_logs al
           left join public.users u on u.id = al.user_id
          order by al.created_at desc
          limit 10`
      ),
      query(
        `select id, title, event_type as type, start_time::text as scheduled_for, participants
           from public.calendar_events
          where start_time >= now()
          order by start_time asc
          limit 5`
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
        upcomingEvents: events.length,
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
