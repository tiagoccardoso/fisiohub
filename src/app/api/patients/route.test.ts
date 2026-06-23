import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { GET, POST } from './route'

jest.mock('@/lib/auth-server', () => ({ requireAuth: jest.fn() }))
jest.mock('@/lib/db-neon', () => ({ query: jest.fn(), queryOne: jest.fn() }))

const user = { id: 'user-1', clinic_id: 'clinic-1', role: 'admin' as const }
const patient = {
  full_name: 'Maria Oliveira Silva',
  cpf: '529.982.247-25',
  birth_date: '1990-05-20',
  gender: 'female',
  phone: '(46) 99999-0000',
  email: 'maria@example.com',
  address: 'Rua Exemplo, 100',
  emergency_contact_name: 'João Oliveira',
  emergency_contact_phone: '(46) 98888-0000',
  initial_medical_history: 'Sem cirurgias anteriores.',
  notes: 'Primeiro atendimento.',
}

function requestWith(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest
}

describe('patients API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(requireAuth).mockResolvedValue(user as Awaited<ReturnType<typeof requireAuth>>)
  })

  it('paginates management results and searches CPF only inside the authenticated clinic', async () => {
    jest.mocked(queryOne).mockResolvedValueOnce({ count: '1' })
    jest.mocked(query).mockResolvedValueOnce([{
      id: 'patient-1', full_name: 'Maria Oliveira Silva', birth_date: '1990-05-20',
      status: 'active', created_at: '2026-06-22', cpf_masked: '***.***.***-25',
    }])
    const request = { url: 'http://localhost/api/patients?management=true&search=529.982&page=2&pageSize=10' } as unknown as NextRequest

    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.items[0].cpf_masked).toBe('***.***.***-25')
    expect(jest.mocked(query).mock.calls[0]?.[1]).toEqual([user.clinic_id, 10, 10, '%529.982%', '%529982%'])
    expect(jest.mocked(query).mock.calls[0]?.[0]).toContain("regexp_replace(cpf")
  })

  it('rejects patient management for a role without permission', async () => {
    jest.mocked(requireAuth).mockResolvedValueOnce({ ...user, role: 'guest' } as Awaited<ReturnType<typeof requireAuth>>)
    const request = { url: 'http://localhost/api/patients?management=true' } as unknown as NextRequest
    const response = await GET(request)
    expect(response.status).toBe(403)
    expect(query).not.toHaveBeenCalled()
  })

  it('normalizes CPF and creates the patient in the authenticated clinic', async () => {
    jest.mocked(queryOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'patient-1', ...patient, cpf: '52998224725' })

    const response = await POST(requestWith(patient))

    expect(response.status).toBe(201)
    expect(jest.mocked(queryOne).mock.calls[0]?.[1]).toEqual([user.clinic_id, '52998224725'])
    expect(jest.mocked(queryOne).mock.calls[1]?.[1]).toEqual(expect.arrayContaining([
      'Maria Oliveira Silva',
      '52998224725',
      user.id,
      user.clinic_id,
    ]))
  })

  it.each([
    ['', 'O CPF é obrigatório.'],
    ['529.982.247-2', 'Informe os 11 dígitos do CPF.'],
    ['529.982.247-24', 'CPF inválido.'],
  ])('rejects CPF %s before accessing the database', async (cpf, message) => {
    const response = await POST(requestWith({ ...patient, cpf }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe(message)
    expect(queryOne).not.toHaveBeenCalled()
  })

  it('rejects a CPF already registered in the same clinic', async () => {
    jest.mocked(queryOne).mockResolvedValueOnce({ id: 'existing-patient' })

    const response = await POST(requestWith(patient))
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('CPF já cadastrado nesta clínica.')
    expect(jest.mocked(queryOne).mock.calls[0]?.[1]).toEqual([user.clinic_id, '52998224725'])
  })

  it('does not treat a CPF from another clinic as a duplicate', async () => {
    jest.mocked(queryOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'patient-2', ...patient, cpf: '52998224725' })

    const response = await POST(requestWith(patient))

    expect(response.status).toBe(201)
    expect(jest.mocked(queryOne).mock.calls[0]?.[1]?.[0]).toBe(user.clinic_id)
  })

  it('returns a safe message when persistence fails', async () => {
    jest.mocked(queryOne)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('database unavailable'))

    const response = await POST(requestWith(patient))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.error).toBe('Erro interno do servidor ao criar paciente.')
    expect(payload.error).not.toContain(patient.cpf)
  })
})
