import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { execute, queryOne, withTransaction } from '@/lib/db-neon'
import { apiError, getIdFromRequest, isManager, logActivity } from '@/lib/tenant-api'
import { notebookSchema, notebookSelect } from '@/lib/notebook-management'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const notebook = await queryOne(`${notebookSelect} where n.id = $1 and n.clinic_id = $2
      and ($3 = true or n.is_public = true or coalesce(n.owner_id, n.created_by) = $4
           or exists (select 1 from public.notebook_collaborators nc where nc.notebook_id = n.id and nc.user_id = $4 and nc.clinic_id = $2)) limit 1`,
      [getIdFromRequest(request), user.clinic_id, isManager(user), user.id])
    if (!notebook) return NextResponse.json({ error: 'Caderno não encontrado.' }, { status: 404 })
    return NextResponse.json(notebook)
  } catch (error) {
    return apiError(error, 'Erro ao consultar caderno.')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = getIdFromRequest(request)
    const validation = notebookSchema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message, fieldErrors: validation.error.flatten().fieldErrors }, { status: 400 })
    const data = validation.data
    const notebook = await withTransaction(async (client) => {
      const current = (await client.query<{ content: unknown; title: string }>(
        `select content, title from public.notebooks where id = $1 and clinic_id = $2
          and ($3 = true or coalesce(owner_id, created_by) = $4
               or exists (select 1 from public.notebook_collaborators nc where nc.notebook_id = public.notebooks.id
                            and nc.user_id = $4 and nc.clinic_id = $2 and nc.permission in ('write', 'admin'))) for update`,
        [id, user.clinic_id, isManager(user), user.id]
      )).rows[0]
      if (!current) return null
      await client.query(
        `insert into public.document_versions
          (document_id, document_type, user_id, user_name, content, content_preview, changes_summary, version_number, is_current, clinic_id)
         values ($1, 'notebook', $2, $3, $4::jsonb, left($5, 240), $6,
                 coalesce((select max(version_number) + 1 from public.document_versions where document_id = $1 and clinic_id = $7), 1), false, $7)`,
        [id, user.id, user.full_name, JSON.stringify(current.content ?? {}), data.content, `Atualização de ${current.title}`, user.clinic_id]
      )
      const result = await client.query(
        `update public.notebooks set title = $2, description = nullif($3, ''), content = to_jsonb($4::text),
           template_type = $5::public.template_type, icon = coalesce($6, icon), color = coalesce($7, color),
           category = coalesce($8, category), tags = coalesce($9::text[], tags), is_public = coalesce($10, is_public), updated_at = now()
         where id = $1 and clinic_id = $11 returning id`,
        [id, data.title, data.description || '', data.content, data.template_type, data.icon, data.color, data.category, data.tags, data.is_public, user.clinic_id]
      )
      return result.rows[0]
    })
    if (!notebook) return NextResponse.json({ error: 'Caderno não encontrado ou sem permissão.' }, { status: 404 })
    const result = await queryOne(`${notebookSelect} where n.id = $1 and n.clinic_id = $2`, [id, user.clinic_id])
    await logActivity(user, 'update', 'notebook', id)
    return NextResponse.json(result)
  } catch (error) {
    return apiError(error, 'Erro ao atualizar caderno.')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = getIdFromRequest(request)
    const result = await execute(
      `delete from public.notebooks where id = $1 and clinic_id = $2 and ($3 = true or coalesce(owner_id, created_by) = $4)`,
      [id, user.clinic_id, isManager(user), user.id]
    )
    if (!result.rowCount) return NextResponse.json({ error: 'Caderno não encontrado ou sem permissão.' }, { status: 404 })
    await logActivity(user, 'delete', 'notebook', id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error, 'Erro ao excluir caderno.')
  }
}
