import { z } from 'zod'

export const exerciseCategories = [
  'Fortalecimento',
  'Mobilidade',
  'Alongamento',
  'Estabilização',
  'Coordenação',
  'Equilíbrio',
  'Funcional',
] as const

export const exerciseAnatomicalRegions = [
  'Cervical',
  'Membros Superiores',
  'Tronco',
  'Membros Inferiores',
  'Mobilidade Geral',
  'Core/Estabilização',
] as const

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do exercício.').max(160),
  description: z.string().trim().min(5, 'Informe uma descrição com pelo menos 5 caracteres.').max(5000),
  category: z.string().trim().min(1, 'Selecione uma categoria.').max(100),
  anatomical_region: z.string().trim().min(1, 'Selecione a região anatômica.').max(100),
  video_url: z.union([
    z.string().trim().url('Informe uma URL de vídeo válida.').max(1000),
    z.literal(''),
  ]).default(''),
  difficulty_level: z.coerce.number().int().min(1).max(5),
  duration: z.coerce.number().int().min(1).max(300).optional(),
  muscle_group: z.string().trim().max(500).default(''),
  indications: z.string().trim().max(2000).default(''),
  contraindications: z.string().trim().max(2000).default(''),
  is_favorite: z.boolean().optional().default(false),
}).strict()

export type ExerciseFormData = z.infer<typeof exerciseFormSchema>

export type Exercise = ExerciseFormData & {
  id: string
  created_at?: string
  updated_at?: string
}

export type ExercisePermissions = {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}
