import { z } from 'zod'

export const projectSchema = z.object({
  title: z.string().trim().min(2, 'Informe o título do projeto.').max(180), description: z.string().trim().max(3000).optional().nullable(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).default('planning'), priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional().nullable(), start_date: z.string().optional().nullable(), progress: z.coerce.number().int().min(0).max(100).optional(),
  budget: z.coerce.number().min(0).optional().nullable(), category: z.enum(['clinical', 'research', 'education', 'administrative', 'other']).default('clinical'),
  tags: z.array(z.string().trim().max(60)).max(30).optional(),
})
export const projectSelect = `select p.id, p.title, p.description, p.status::text, p.priority::text,
       p.due_date::text, p.start_date::text, p.progress, p.completion_percentage, p.budget,
       p.category, p.tags, p.owner_id, p.created_by, p.created_at::text, p.updated_at::text,
       json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'role', u.role::text, 'avatar_url', u.avatar_url) as owner,
       (select count(*)::int from public.tasks t where t.project_id = p.id and t.clinic_id = p.clinic_id) as task_count
  from public.projects p left join public.users u on u.id = coalesce(p.owner_id, p.created_by) and u.clinic_id = p.clinic_id`
