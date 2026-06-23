import { NextResponse } from 'next/server'
import type { User } from '@/lib/auth-server'
import { execute, queryOne } from '@/lib/db-neon'

export const isManager = (user: User) => user.role === 'admin' || user.role === 'mentor'

export function apiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : ''
  const status = message === 'Não autorizado' ? 401 : message === 'Permissões insuficientes' ? 403 : 500
  return NextResponse.json({ error: status === 500 ? fallback : message }, { status })
}

export async function belongsToClinic(table: 'users' | 'projects' | 'notebooks' | 'patients', id: string, clinicId: string) {
  return Boolean(await queryOne(`select id from public.${table} where id = $1 and clinic_id = $2 limit 1`, [id, clinicId]))
}

export function getIdFromRequest(request: Request) {
  return new URL(request.url).pathname.split('/').filter(Boolean).at(-1) || ''
}

export async function logActivity(user: User, action: 'create' | 'update' | 'delete' | 'comment' | 'restore', resourceType: 'notebook' | 'project' | 'task' | 'comment' | 'calendar_event' | 'user' | 'setting', resourceId?: string | null) {
  try {
    await execute(
      `insert into public.activity_logs (user_id, action, resource_type, resource_id, metadata, clinic_id)
       values ($1, $2::public.activity_action, $3::public.resource_type, $4, '{}'::jsonb, $5)`,
      [user.id, action, resourceType, resourceId || null, user.clinic_id]
    )
  } catch (error) {
    console.error('[activity-log] Falha ao registrar atividade.', error)
  }
}
