import { patientProfileSchema } from './patient-profile'

const validProfile = {
  patientId: '7f95a9a4-87f1-4a29-93df-9763d3320dbe',
  age: 45,
  condition: 'lombalgia',
  severity: 'moderate',
  painLevel: 6,
  lifestyle: 'active',
}

describe('patientProfileSchema', () => {
  it('accepts a complete patient profile', () => {
    expect(patientProfileSchema.safeParse(validProfile).success).toBe(true)
  })

  it('rejects pain levels outside the clinical scale', () => {
    expect(patientProfileSchema.safeParse({ ...validProfile, painLevel: 11 }).success).toBe(false)
  })

  it('rejects unsupported profile values', () => {
    expect(patientProfileSchema.safeParse({ ...validProfile, severity: 'critical' }).success).toBe(false)
  })
})
