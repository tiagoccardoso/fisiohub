import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { query } from '@/lib/db-neon'
import { apiError } from '@/lib/tenant-api'
import { getDocumentType } from '@/lib/collaboration-access'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const id = new URL(request.url).searchParams.get('document_id') || ''
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json([])
    if (!await getDocumentType(id, user.clinic_id)) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
    return NextResponse.json(await query(
      `select id, user_id, coalesce(user_name, 'Usuário') as user_name, created_at::text, changes_summary,
              content_preview, is_current, document_id, version_number
         from public.document_versions where document_id = $1 and clinic_id = $2 order by version_number desc, created_at desc`,
      [id, user.clinic_id]
    ))
  } catch (error) { return apiError(error, 'Erro ao carregar versões.') }
}
