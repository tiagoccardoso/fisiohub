import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { execute, query, queryOne } from '@/lib/db-neon'
import { logActivity } from '@/lib/tenant-api'

const TaskSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional().nullable(),
  parent_task_id: z.string().uuid().optional().nullable(),
  title: z.string().min(2, 'O título da tarefa é obrigatório'),
  description: z.string().optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  patient_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  order_index: z.coerce.number().int().optional(),
  estimated_hours: z.coerce.number().int().min(0).optional().nullable(),
  actual_hours: z.coerce.number().int().min(0).optional(),
  checklist: z.array(z.object({ id: z.string(), text: z.string().min(1), completed: z.boolean() })).max(100).optional(),
  attachments: z.array(z.object({ id: z.string(), name: z.string(), url: z.string(), type: z.string(), size: z.number().nonnegative() })).max(50).optional(),
})

async function validateReferences(clinicId: string, projectId?: string | null, assigneeId?: string | null, patientId?: string | null) {
  const result = await queryOne<{ ok: boolean }>(
    `select ($2::uuid is null or exists(select 1 from public.projects where id = $2 and clinic_id = $1))
      and ($3::uuid is null or exists(select 1 from public.users where id = $3 and clinic_id = $1 and is_active = true))
      and ($4::uuid is null or exists(select 1 from public.patients where id = $4 and clinic_id = $1 and status <> 'archived')) as ok`,
    [clinicId, projectId || null, assigneeId || null, patientId || null]
  )
  return Boolean(result?.ok)
}

const taskSelect = `select t.*,
       json_build_object('full_name', au.full_name, 'avatar_url', au.avatar_url) as assignee,
       json_build_object('full_name', au.full_name) as assigned_to_user,
       json_build_object('full_name', cu.full_name) as created_by_user,
       json_build_object('title', p.title) as project
  from public.tasks t
  left join public.users au on au.id = coalesce(t.assigned_to, t.assignee_id)
  left join public.users cu on cu.id = t.created_by
  left join public.projects p on p.id = t.project_id`

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    const tasks = projectId
      ? await query(
          `${taskSelect}
            where t.project_id = $1 and t.clinic_id = $2
            order by t.order_index asc, t.created_at desc`,
          [projectId, user.clinic_id]
        )
      : await query(`${taskSelect} where t.clinic_id = $1 order by t.order_index asc, t.created_at desc limit 200`, [user.clinic_id])

    return NextResponse.json(tasks)
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro interno do servidor' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = TaskSchema.safeParse(body)
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 })

    const data = validation.data
    const assignee = data.assigned_to || data.assignee_id || null
    if (!await validateReferences(user.clinic_id, data.project_id, assignee, data.patient_id)) {
      return NextResponse.json({ error: 'Projeto, responsável ou paciente inválido para esta clínica.' }, { status: 400 })
    }
    const task = await queryOne(
      `insert into public.tasks
        (project_id, parent_task_id, title, description, status, priority, assigned_to, assignee_id, patient_id, due_date, order_index,
         estimated_hours, actual_hours, checklist, attachments, created_by, clinic_id)
       values
        ($1, $2, $3, $4, $5::public.task_status, $6::public.task_priority, $7, $8, $9, nullif($10, '')::timestamptz, coalesce($11, 0),
         $12, coalesce($13, 0), coalesce($14::jsonb, '[]'), coalesce($15::jsonb, '[]'), $16, $17)
       returning *`,
      [
        data.project_id || null,
        data.parent_task_id || null,
        data.title,
        data.description || null,
        data.status,
        data.priority,
        data.assigned_to || data.assignee_id || null,
        data.assignee_id || data.assigned_to || null,
        data.patient_id || null,
        data.due_date || '',
        data.order_index ?? 0,
        data.estimated_hours ?? null,
        data.actual_hours ?? 0,
        data.checklist ? JSON.stringify(data.checklist) : null,
        data.attachments ? JSON.stringify(data.attachments) : null,
        user.id, user.clinic_id,
      ]
    )

    await logActivity(user, 'create', 'task', (task as { id?: string } | null)?.id)
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    console.error('[tasks/post] error', error)
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Falha ao criar tarefa' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = TaskSchema.partial().extend({ id: z.string().uuid() }).safeParse(body)
    if (!validation.success) return NextResponse.json({ error: validation.error.format() }, { status: 400 })

    const { id, ...data } = validation.data
    if (!id) return NextResponse.json({ error: 'O ID da tarefa é obrigatório' }, { status: 400 })

    const assignee = data.assigned_to ?? data.assignee_id
    if (!await validateReferences(user.clinic_id, data.project_id, assignee, data.patient_id)) {
      return NextResponse.json({ error: 'Projeto, responsável ou paciente inválido para esta clínica.' }, { status: 400 })
    }
    const task = await queryOne(
      `update public.tasks set
          project_id = coalesce($2, project_id),
          parent_task_id = coalesce($3, parent_task_id),
          title = coalesce($4, title),
          description = coalesce($5, description),
          status = coalesce($6::public.task_status, status),
          priority = coalesce($7::public.task_priority, priority),
          assigned_to = coalesce($8, assigned_to),
          assignee_id = coalesce($9, assignee_id),
          patient_id = coalesce($10, patient_id),
          due_date = coalesce(nullif($11, '')::timestamptz, due_date),
          order_index = coalesce($12, order_index),
          estimated_hours = coalesce($14, estimated_hours),
          actual_hours = coalesce($15, actual_hours),
          checklist = coalesce($16::jsonb, checklist),
          attachments = coalesce($17::jsonb, attachments),
          completed_at = case when $6::text = 'done' then coalesce(completed_at, now()) when $6::text is not null then null else completed_at end,
          updated_at = now()
        where id = $1 and clinic_id = $13
        returning *`,
      [
        id,
        data.project_id ?? null,
        data.parent_task_id ?? null,
        data.title ?? null,
        data.description ?? null,
        data.status ?? null,
        data.priority ?? null,
        data.assigned_to ?? data.assignee_id ?? null,
        data.assignee_id ?? data.assigned_to ?? null,
        data.patient_id ?? null,
        data.due_date ?? '',
        data.order_index ?? null,
        user.clinic_id,
        data.estimated_hours ?? null,
        data.actual_hours ?? null,
        data.checklist ? JSON.stringify(data.checklist) : null,
        data.attachments ? JSON.stringify(data.attachments) : null,
      ]
    )

    if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
    await logActivity(user, 'update', 'task', id)
    return NextResponse.json(task)
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Falha ao atualizar tarefa' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'O ID da tarefa é obrigatório' }, { status: 400 })

    const result = await execute('delete from public.tasks where id = $1 and clinic_id = $2', [id, user.clinic_id])
    if (result.rowCount === 0) return NextResponse.json({ error: 'Tarefa nao encontrada.' }, { status: 404 })
    await logActivity(user, 'delete', 'task', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : 'Erro interno do servidor' },
      { status: unauthorized ? 401 : 500 }
    )
  }
}
