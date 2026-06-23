import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { execute, queryOne } from '@/lib/db-neon'
import { apiError, getIdFromRequest, isManager, logActivity } from '@/lib/tenant-api'
import { projectSchema, projectSelect } from '@/lib/project-management'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const project = await queryOne(`${projectSelect} where p.id = $1 and p.clinic_id = $2`, [getIdFromRequest(request), user.clinic_id])
    if (!project) return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    return NextResponse.json(project)
  } catch (error) { return apiError(error, 'Erro ao consultar projeto.') }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!isManager(user)) return NextResponse.json({ error: 'Permissões insuficientes' }, { status: 403 })
    const id = getIdFromRequest(request)
    const validation = projectSchema.partial().safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message, fieldErrors: validation.error.flatten().fieldErrors }, { status: 400 })
    const d = validation.data
    const updated = await queryOne(
      `update public.projects set
         title = coalesce($3, title), description = case when $4::text is null then description else nullif($4, '') end,
         status = coalesce($5::public.project_status, status), priority = coalesce($6::public.task_priority, priority),
         due_date = case when $7::text is null then due_date else nullif($7, '')::date end,
         start_date = case when $8::text is null then start_date else nullif($8, '')::date end,
         progress = coalesce($9, progress), completion_percentage = coalesce($9, completion_percentage),
         budget = coalesce($10, budget), category = coalesce($11, category), tags = coalesce($12::text[], tags), updated_at = now()
       where id = $1 and clinic_id = $2 returning id`,
      [id, user.clinic_id, d.title, d.description, d.status, d.priority, d.due_date, d.start_date, d.progress, d.budget, d.category, d.tags]
    )
    if (!updated) return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    await logActivity(user, 'update', 'project', id)
    return NextResponse.json(await queryOne(`${projectSelect} where p.id = $1 and p.clinic_id = $2`, [id, user.clinic_id]))
  } catch (error) { return apiError(error, 'Erro ao atualizar projeto.') }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!isManager(user)) return NextResponse.json({ error: 'Permissões insuficientes' }, { status: 403 })
    const id = getIdFromRequest(request)
    const result = await execute('delete from public.projects where id = $1 and clinic_id = $2', [id, user.clinic_id])
    if (!result.rowCount) return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    await logActivity(user, 'delete', 'project', id)
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error, 'Erro ao excluir projeto.') }
}
