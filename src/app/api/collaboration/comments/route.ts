import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { apiError } from '@/lib/tenant-api'
import { getDocumentType } from '@/lib/collaboration-access'

const schema = z.object({
  document_id: z.string().uuid(),
  content: z.string().trim().min(1, 'Escreva o comentário.').max(5000),
  parent_id: z.string().uuid().optional().nullable(),
  selection_text: z.string().max(2000).optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = new URL(request.url).searchParams.get('document_id') || ''
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json([])
    if (!await getDocumentType(id, user.clinic_id)) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
    const rows = await query(
      `select c.id, coalesce(c.user_id, c.author_id) as user_id, coalesce(c.user_name, u.full_name, 'Usuário') as user_name,
              coalesce(c.user_avatar, u.avatar_url) as user_avatar, c.content, c.created_at::text, c.updated_at::text,
              c.is_pinned, c.document_id, c.selection_text, coalesce(c.parent_id, c.parent_comment_id) as parent_id
         from public.comments c left join public.users u on u.id = coalesce(c.user_id, c.author_id)
        where c.document_id = $1 and c.clinic_id = $2 order by c.created_at asc`,
      [id, user.clinic_id]
    ) as Array<Record<string, unknown> & { id: string; parent_id?: string | null }>
    const parents = rows.filter((row) => !row.parent_id).map((row) => ({ ...row, replies: rows.filter((reply) => reply.parent_id === row.id) }))
    return NextResponse.json(parents)
  } catch (error) { return apiError(error, 'Erro ao carregar comentários.') }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const validation = schema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message, fieldErrors: validation.error.flatten().fieldErrors }, { status: 400 })
    const d = validation.data
    const type = await getDocumentType(d.document_id, user.clinic_id)
    if (!type) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
    if (d.parent_id) {
      const parent = await queryOne('select id from public.comments where id = $1 and document_id = $2 and clinic_id = $3', [d.parent_id, d.document_id, user.clinic_id])
      if (!parent) return NextResponse.json({ error: 'Comentário pai inválido.' }, { status: 400 })
    }
    const row = await queryOne(
      `insert into public.comments
        (content, author_id, user_id, user_name, user_avatar, target_type, target_id, document_id, selection_text, parent_id, parent_comment_id, clinic_id)
       values ($1, $2, $2, $3, $4, $5::public.comment_target_type, $6, $6, nullif($7, ''), $8, $8, $9)
       returning id, user_id, user_name, user_avatar, content, created_at::text, updated_at::text, is_pinned, document_id, selection_text, parent_id`,
      [d.content, user.id, user.full_name, user.avatar_url || null, type, d.document_id, d.selection_text || '', d.parent_id || null, user.clinic_id]
    )
    return NextResponse.json(row, { status: 201 })
  } catch (error) { return apiError(error, 'Erro ao publicar comentário.') }
}
