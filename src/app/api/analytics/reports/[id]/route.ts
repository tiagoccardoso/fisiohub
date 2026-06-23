import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { execute, queryOne } from '@/lib/db-neon'
import { apiError, getIdFromRequest, isManager } from '@/lib/tenant-api'
import { reportSchema } from '@/lib/analysis-report'

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const validation = reportSchema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message }, { status: 400 })
    const d = validation.data
    const row = await queryOne(
      `update public.analysis_reports set title = $5, analysis_type = $6, status = $7, notes = nullif($8, ''), updated_at = now()
       where id = $1 and clinic_id = $2 and ($3 = true or created_by = $4) returning *`,
      [getIdFromRequest(request), user.clinic_id, isManager(user), user.id, d.title, d.analysis_type, d.status, d.notes || ''])
    if (!row) return NextResponse.json({ error: 'Análise não encontrada ou sem permissão.' }, { status: 404 })
    return NextResponse.json(row)
  } catch (error) { return apiError(error, 'Erro ao atualizar análise.') }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const result = await execute('delete from public.analysis_reports where id = $1 and clinic_id = $2 and ($3 = true or created_by = $4)', [getIdFromRequest(request), user.clinic_id, isManager(user), user.id])
    if (!result.rowCount) return NextResponse.json({ error: 'Análise não encontrada ou sem permissão.' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error, 'Erro ao excluir análise.') }
}
