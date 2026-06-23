import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { apiError } from '@/lib/tenant-api'
import { reportSchema } from '@/lib/analysis-report'

export async function GET() {
  try {
    const user = await requireAuth()
    return NextResponse.json(await query(
      `select id, title, analysis_type, status, notes, payload, created_by, created_at::text, updated_at::text
       from public.analysis_reports where clinic_id = $1 order by updated_at desc`, [user.clinic_id]))
  } catch (error) { return apiError(error, 'Erro ao carregar análises salvas.') }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const validation = reportSchema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message }, { status: 400 })
    const d = validation.data
    const report = await queryOne(
      `insert into public.analysis_reports (title, analysis_type, status, notes, payload, created_by, clinic_id)
       values ($1, $2, $3, nullif($4, ''), '{}'::jsonb, $5, $6) returning *`,
      [d.title, d.analysis_type, d.status, d.notes || '', user.id, user.clinic_id])
    return NextResponse.json(report, { status: 201 })
  } catch (error) { return apiError(error, 'Erro ao salvar análise.') }
}
