import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { apiError, isManager, logActivity } from '@/lib/tenant-api'
import { projectSchema, projectSelect } from '@/lib/project-management'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const params = new URL(request.url).searchParams
    if (params.get('stats') === '1') {
      const row = await queryOne<{
        total_projects: string; active_projects: string; completed_this_month: string; overdue_projects: string;
        total_tasks: string; done_tasks: string; average_completion_time: string | null
      }>(
        `select count(*)::text as total_projects,
          count(*) filter (where status = 'active')::text as active_projects,
          count(*) filter (where status = 'completed' and updated_at >= date_trunc('month', now()))::text as completed_this_month,
          count(*) filter (where due_date < current_date and status not in ('completed', 'cancelled'))::text as overdue_projects,
          (select count(*) from public.tasks where clinic_id = $1)::text as total_tasks,
          (select count(*) from public.tasks where clinic_id = $1 and status = 'done')::text as done_tasks,
          round(avg(extract(epoch from (updated_at - created_at)) / 86400) filter (where status = 'completed'), 1)::text as average_completion_time
         from public.projects where clinic_id = $1`,
        [user.clinic_id]
      )
      const totalTasks = Number(row?.total_tasks || 0)
      return NextResponse.json({
        total_projects: Number(row?.total_projects || 0), active_projects: Number(row?.active_projects || 0),
        completed_this_month: Number(row?.completed_this_month || 0), overdue_projects: Number(row?.overdue_projects || 0),
        team_productivity: totalTasks ? Math.round(Number(row?.done_tasks || 0) / totalTasks * 100) : 0,
        average_completion_time: Number(row?.average_completion_time || 0),
      })
    }
    const rows = await query(`${projectSelect} where p.clinic_id = $1 order by p.updated_at desc limit 200`, [user.clinic_id])
    return NextResponse.json(rows)
  } catch (error) {
    return apiError(error, 'Erro ao carregar projetos.')
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!isManager(user)) return NextResponse.json({ error: 'Permissões insuficientes' }, { status: 403 })
    const validation = projectSchema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message, fieldErrors: validation.error.flatten().fieldErrors }, { status: 400 })
    const data = validation.data
    const project = await queryOne(
      `with inserted as (
         insert into public.projects
          (title, description, status, priority, due_date, start_date, progress, completion_percentage, budget, category, tags, owner_id, created_by, clinic_id)
         values ($1, nullif($2, ''), $3::public.project_status, $4::public.task_priority, nullif($5, '')::date,
                 nullif($6, '')::date, coalesce($7, 0), coalesce($7, 0), $8, $9, coalesce($10::text[], '{}'), $11, $11, $12)
         returning *
       ) ${projectSelect.replace('from public.projects p', 'from inserted p')}`,
      [data.title, data.description || '', data.status, data.priority, data.due_date || '', data.start_date || '', data.progress, data.budget, data.category, data.tags || [], user.id, user.clinic_id]
    )
    await logActivity(user, 'create', 'project', (project as { id?: string } | null)?.id)
    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    return apiError(error, 'Erro ao criar projeto.')
  }
}
