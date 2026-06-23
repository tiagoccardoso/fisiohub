import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole } from '@/lib/auth-server'
import { execute, queryOne } from '@/lib/db-neon'
import { apiError, getIdFromRequest } from '@/lib/tenant-api'

const schema = z.object({
  full_name: z.string().trim().min(3).max(180).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(['admin', 'mentor', 'intern', 'guest', 'professional', 'therapist', 'receptionist', 'student']).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  crefito: z.string().trim().max(40).optional().nullable(),
  specialty: z.string().trim().max(120).optional().nullable(),
  university: z.string().trim().max(180).optional().nullable(),
  semester: z.coerce.number().int().min(1).max(20).optional().nullable(),
  is_active: z.boolean().optional(),
})

async function ensureAdminSafety(id: string, clinicId: string, actorId: string, nextRole?: string, nextActive?: boolean) {
  const target = await queryOne<{ role: string; is_active: boolean }>('select role::text, is_active from public.users where id = $1 and clinic_id = $2', [id, clinicId])
  if (!target) return 'not_found'
  if (id === actorId && (nextActive === false || (nextRole && nextRole !== 'admin'))) return 'self'
  if (target.role === 'admin' && target.is_active && (nextActive === false || (nextRole && nextRole !== 'admin'))) {
    const count = await queryOne<{ count: string }>("select count(*)::text as count from public.users where clinic_id = $1 and role = 'admin' and is_active = true", [clinicId])
    if (Number(count?.count || 0) <= 1) return 'last_admin'
  }
  return 'ok'
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole(['admin'])
    const id = getIdFromRequest(request)
    const validation = schema.safeParse(await request.json())
    if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message, fieldErrors: validation.error.flatten().fieldErrors }, { status: 400 })
    const d = validation.data
    const safety = await ensureAdminSafety(id, user.clinic_id, user.id, d.role, d.is_active)
    if (safety === 'not_found') return NextResponse.json({ error: 'Integrante não encontrado.' }, { status: 404 })
    if (safety === 'self') return NextResponse.json({ error: 'Você não pode remover suas próprias permissões administrativas.' }, { status: 409 })
    if (safety === 'last_admin') return NextResponse.json({ error: 'A clínica deve manter ao menos um administrador ativo.' }, { status: 409 })
    const member = await queryOne(
      `update public.users set full_name = coalesce($3, full_name), display_name = coalesce($3, display_name),
         email = coalesce($4::citext, email), role = coalesce($5::public.user_role, role),
         phone = case when $6::text is null then phone else nullif($6, '') end,
         crefito = case when $7::text is null then crefito else nullif($7, '') end,
         specialty = case when $8::text is null then specialty else nullif($8, '') end,
         university = case when $9::text is null then university else nullif($9, '') end,
         semester = coalesce($10, semester), is_active = coalesce($11, is_active), updated_at = now()
       where id = $1 and clinic_id = $2
       returning id, full_name, email, role::text as role, phone, crefito, specialty, university, semester, is_active, created_at::text, updated_at::text`,
      [id, user.clinic_id, d.full_name, d.email?.toLowerCase(), d.role, d.phone, d.crefito, d.specialty, d.university, d.semester, d.is_active]
    )
    return NextResponse.json(member)
  } catch (error) { return apiError(error, 'Erro ao atualizar integrante.') }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole(['admin'])
    const id = getIdFromRequest(request)
    const safety = await ensureAdminSafety(id, user.clinic_id, user.id, undefined, false)
    if (safety === 'not_found') return NextResponse.json({ error: 'Integrante não encontrado.' }, { status: 404 })
    if (safety === 'self') return NextResponse.json({ error: 'Você não pode inativar seu próprio acesso.' }, { status: 409 })
    if (safety === 'last_admin') return NextResponse.json({ error: 'A clínica deve manter ao menos um administrador ativo.' }, { status: 409 })
    await execute('update public.users set is_active = false, updated_at = now() where id = $1 and clinic_id = $2', [id, user.clinic_id])
    return NextResponse.json({ ok: true })
  } catch (error) { return apiError(error, 'Erro ao inativar integrante.') }
}
