import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { apiError, isManager, logActivity } from '@/lib/tenant-api'
import { notebookSchema, notebookSelect } from '@/lib/notebook-management'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const search = new URL(request.url).searchParams.get('search')?.trim() || ''
    const rows = await query(
      `${notebookSelect}
        where n.clinic_id = $1
          and ($2 = '' or n.title ilike '%' || $2 || '%' or coalesce(n.description, '') ilike '%' || $2 || '%')
          and ($3 = true or n.is_public = true or coalesce(n.owner_id, n.created_by) = $4
               or exists (select 1 from public.notebook_collaborators nc where nc.notebook_id = n.id and nc.user_id = $4 and nc.clinic_id = $1))
        order by n.updated_at desc limit 200`,
      [user.clinic_id, search, isManager(user), user.id]
    )
    return NextResponse.json(rows)
  } catch (error) {
    return apiError(error, 'Erro ao carregar cadernos.')
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const validation = notebookSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0]?.message, fieldErrors: validation.error.flatten().fieldErrors }, { status: 400 })
    }
    const data = validation.data
    const notebook = await queryOne(
      `with inserted as (
         insert into public.notebooks
           (title, description, content, template_type, icon, color, category, tags, is_public, owner_id, created_by, clinic_id)
         values ($1, nullif($2, ''), to_jsonb($3::text), $4::public.template_type, coalesce($5, '📁'),
                 coalesce($6, 'default'), coalesce($7, 'geral'), coalesce($8::text[], '{}'), coalesce($9, false), $10, $10, $11)
         returning *
       )
       ${notebookSelect.replace('from public.notebooks n', 'from inserted n')}`,
      [data.title, data.description || '', data.content, data.template_type, data.icon, data.color, data.category, data.tags || [], data.is_public, user.id, user.clinic_id]
    )
    await logActivity(user, 'create', 'notebook', (notebook as { id?: string } | null)?.id)
    return NextResponse.json(notebook, { status: 201 })
  } catch (error) {
    return apiError(error, 'Erro ao criar caderno.')
  }
}
