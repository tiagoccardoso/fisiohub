import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { execute, queryOne } from '@/lib/db-neon'
import { apiError, getIdFromRequest, isManager } from '@/lib/tenant-api'

const updateSchema = z.object({ content: z.string().trim().min(1).max(5000).optional(), is_pinned: z.boolean().optional() }).refine((d) => Object.keys(d).length > 0)

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const validation = updateSchema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message || 'Dados inválidos.' }, { status: 400 })
    const row = await queryOne(
      `update public.comments set content = coalesce($5, content), is_pinned = coalesce($6, is_pinned), updated_at = now()
       where id = $1 and clinic_id = $2 and ($3 = true or coalesce(user_id, author_id) = $4)
       returning id, content, is_pinned, updated_at::text`,
      [getIdFromRequest(request), user.clinic_id, isManager(user), user.id, validation.data.content, validation.data.is_pinned]
    )
    if (!row) return NextResponse.json({ error: 'Comentário não encontrado ou sem permissão.' }, { status: 404 })
    return NextResponse.json(row)
  } catch (error) { return apiError(error, 'Erro ao atualizar comentário.') }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const result = await execute(
      'delete from public.comments where id = $1 and clinic_id = $2 and ($3 = true or coalesce(user_id, author_id) = $4)',
      [getIdFromRequest(request), user.clinic_id, isManager(user), user.id]
    )
    if (!result.rowCount) return NextResponse.json({ error: 'Comentário não encontrado ou sem permissão.' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error, 'Erro ao excluir comentário.') }
}
