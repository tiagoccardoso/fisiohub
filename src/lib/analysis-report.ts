import { z } from 'zod'

export const reportSchema = z.object({
  title: z.string().trim().min(2).max(180),
  analysis_type: z.enum(['operational', 'clinical', 'financial', 'team', 'custom']).default('operational'),
  status: z.enum(['draft', 'final', 'archived']).default('draft'),
  notes: z.string().trim().max(10000).optional().nullable(),
})
