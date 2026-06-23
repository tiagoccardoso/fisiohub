import { queryOne } from '@/lib/db-neon'

export async function getDocumentType(id: string, clinicId: string) {
  const row = await queryOne<{ type: 'notebook' | 'project' }>(
    `select 'notebook'::text as type from public.notebooks where id = $1 and clinic_id = $2
     union all select 'project'::text from public.projects where id = $1 and clinic_id = $2 limit 1`, [id, clinicId])
  return row?.type || null
}
