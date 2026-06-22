import { formatCpf, isValidCpf, patientFormSchema } from './patient'

const validPatient = {
  full_name: 'Maria Oliveira Silva',
  cpf: '529.982.247-25',
  birth_date: '1990-05-20',
  gender: 'female',
  phone: '(46) 99999-0000',
  email: 'maria@example.com',
  address: 'Rua Exemplo, 100',
  emergency_contact_name: 'João Oliveira',
  emergency_contact_phone: '(46) 98888-0000',
  initial_medical_history: '',
  notes: '',
}

describe('patient validation', () => {
  it('formats CPF while typing and stores only digits after validation', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25')
    const result = patientFormSchema.parse(validPatient)
    expect(result.cpf).toBe('52998224725')
  })

  it.each(['', '529.982.247-2', '111.111.111-11', '529.982.247-24'])(
    'rejects an empty, incomplete or invalid CPF: %s',
    (cpf) => {
      expect(patientFormSchema.safeParse({ ...validPatient, cpf }).success).toBe(false)
    }
  )

  it('validates CPF check digits', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('529.982.247-24')).toBe(false)
  })
})
