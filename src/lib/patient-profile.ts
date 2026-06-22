import { z } from 'zod'

export const patientProfileSchema = z.object({
  patientId: z.string().uuid('Paciente inválido.'),
  age: z.coerce.number().int().min(0, 'A idade não pode ser negativa.').max(130, 'Idade inválida.'),
  condition: z.enum(['lombalgia', 'cervicalgia', 'ombro', 'joelho']),
  severity: z.enum(['mild', 'moderate', 'severe']),
  painLevel: z.coerce.number().int().min(0, 'A dor deve estar entre 0 e 10.').max(10, 'A dor deve estar entre 0 e 10.'),
  lifestyle: z.enum(['sedentary', 'active', 'very_active']),
})

export type PatientProfileInput = z.infer<typeof patientProfileSchema>

export type PatientProfileRecord = {
  id: string
  patient_id: string
  clinic_id: string
  age: number
  condition: PatientProfileInput['condition']
  severity: PatientProfileInput['severity']
  pain_level: number
  lifestyle: PatientProfileInput['lifestyle']
  created_at: string
  updated_at?: string
  responsible_user_name?: string | null
}
