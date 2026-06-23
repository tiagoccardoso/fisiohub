import { type CreatedPatient, type PatientFormValues, type PatientRecord } from '@/lib/patient'
// import * as Sentry from '@sentry/nextjs'

export const createPatient = async (patientData: PatientFormValues): Promise<CreatedPatient> => {
  const response = await fetch('/api/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patientData),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Falha ao criar o paciente.')
  }

  return response.json()
}

export const updatePatient = async (id: string, patientData: PatientFormValues): Promise<PatientRecord> => {
  const response = await fetch(`/api/patients/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || 'Falha ao atualizar o paciente.')
  return payload
}

// Função utilitária para log de erros críticos e alertas de segurança
export function logCriticalError(context: string, error: any, req?: Request) {
  const log = {
    context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    url: req?.url,
    timestamp: new Date().toISOString(),
    userAgent: req?.headers?.get('user-agent'),
    ip: req?.headers?.get('x-forwarded-for') || req?.headers?.get('cf-connecting-ip'),
  }
  // Log local
  console.error('[CRITICAL]', log)
  // Sentry removido temporariamente
  // Sentry.captureException(error, { extra: log })
}
