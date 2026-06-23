import { z } from 'zod'

export const notebookSchema = z.object({
  title: z.string().trim().min(2, 'Informe o título do caderno.').max(180),
  description: z.string().trim().max(1000).optional().nullable(), content: z.string().max(2_000_000).optional().default(''),
  template_type: z.enum(['note', 'document', 'protocol', 'evaluation', 'exercise', 'treatment_plan', 'progress_report', 'procedure', 'general']).optional().default('note'),
  icon: z.string().max(20).optional(), color: z.string().max(40).optional(), category: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().max(60)).max(30).optional(), is_public: z.boolean().optional(),
})

export const notebookSelect = `select n.id, n.title, n.description,
       case when jsonb_typeof(n.content) = 'string' then n.content #>> '{}'
            else coalesce(n.content ->> 'html', '') end as content,
       n.template_type::text, n.icon, n.color, n.category, n.tags, n.is_public,
       coalesce(n.owner_id, n.created_by) as owner_id, n.created_by, n.created_at::text, n.updated_at::text,
       (select count(*)::int from public.pages p where p.notebook_id = n.id and p.clinic_id = n.clinic_id) as page_count,
       json_build_object('full_name', u.full_name, 'email', u.email) as owner
  from public.notebooks n left join public.users u on u.id = coalesce(n.owner_id, n.created_by) and u.clinic_id = n.clinic_id`
