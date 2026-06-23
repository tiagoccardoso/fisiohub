import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { queryOne, withTransaction } from '@/lib/db-neon'
import { apiError } from '@/lib/tenant-api'

function versionId(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  return parts.at(-2) || ''
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const restored = await withTransaction(async (client) => {
      const version = (await client.query<{ document_id: string; document_type: string; content: unknown }>(
        'select document_id, document_type, content from public.document_versions where id = $1 and clinic_id = $2 for update',
        [versionId(request), user.clinic_id]
      )).rows[0]
      if (!version || !['notebook', 'project'].includes(version.document_type)) return null
      const table = version.document_type === 'notebook' ? 'notebooks' : 'projects'
      if (table === 'notebooks') {
        await client.query('update public.notebooks set content = $1::jsonb, updated_at = now() where id = $2 and clinic_id = $3', [JSON.stringify(version.content), version.document_id, user.clinic_id])
      } else {
        const payload = version.content as { title?: string; description?: string }
        await client.query('update public.projects set title = coalesce($1, title), description = coalesce($2, description), updated_at = now() where id = $3 and clinic_id = $4', [payload?.title, payload?.description, version.document_id, user.clinic_id])
      }
      await client.query('update public.document_versions set is_current = (id = $1) where document_id = $2 and clinic_id = $3', [versionId(request), version.document_id, user.clinic_id])
      return version
    })
    if (!restored) return NextResponse.json({ error: 'Versão não encontrada.' }, { status: 404 })
    return NextResponse.json({ ok: true, document_id: restored.document_id })
  } catch (error) { return apiError(error, 'Erro ao restaurar versão.') }
}
