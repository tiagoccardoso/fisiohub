import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { queryOne, withTransaction } from '@/lib/db-neon'
import type { TransactionClient } from '@/lib/db-neon'
import { DELETE, PUT } from './route'

jest.mock('@/lib/auth-server', () => ({ requireAuth: jest.fn() }))
jest.mock('@/lib/db-neon', () => ({ queryOne: jest.fn(), withTransaction: jest.fn() }))

const user = { id: 'user-1', clinic_id: 'clinic-1', role: 'admin' as const }
const patientId = '7f95a9a4-87f1-4a29-93df-9763d3320dbe'
const patient = {
  full_name: 'Maria Oliveira Silva', cpf: '529.982.247-25', birth_date: '1990-05-20',
  gender: 'female', phone: '', email: '', address: '', emergency_contact_name: '',
  emergency_contact_phone: '', initial_medical_history: '', notes: '',
}

function putRequest(body: Record<string, unknown>) {
  return {
    url: `http://localhost/api/patients/${patientId}`,
    json: async () => body,
  } as unknown as NextRequest
}

describe('patient update API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(requireAuth).mockResolvedValue(user as Awaited<ReturnType<typeof requireAuth>>)
  })

  it.each(['', '529.982.247-2', '529.982.247-24'])(
    'does not allow an empty, incomplete or invalid CPF to replace the current value: %s',
    async (cpf) => {
      const response = await PUT(putRequest({ ...patient, cpf }))
      expect(response.status).toBe(400)
      expect(queryOne).not.toHaveBeenCalled()
    }
  )

  it('normalizes CPF and checks duplicates only in the authenticated clinic', async () => {
    jest.mocked(queryOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: patientId, cpf: '52998224725' })

    const response = await PUT(putRequest(patient))

    expect(response.status).toBe(200)
    expect(jest.mocked(queryOne).mock.calls[0]?.[1]).toEqual([user.clinic_id, patientId, '52998224725'])
    expect(jest.mocked(queryOne).mock.calls[1]?.[1]).toEqual(expect.arrayContaining([
      patientId,
      '52998224725',
      user.clinic_id,
    ]))
  })

  it('returns a clear conflict for a duplicate CPF in the clinic', async () => {
    jest.mocked(queryOne).mockResolvedValueOnce({ id: 'another-patient' })

    const response = await PUT(putRequest(patient))
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('CPF já cadastrado nesta clínica.')
  })

  it('changes status without accepting an archived state', async () => {
    jest.mocked(queryOne).mockResolvedValueOnce({ id: patientId, status: 'inactive' })
    const response = await PUT(putRequest({ status: 'inactive' }))
    expect(response.status).toBe(200)
    expect(jest.mocked(queryOne).mock.calls[0]?.[1]).toEqual([patientId, 'inactive', user.clinic_id])

    const archivedResponse = await PUT(putRequest({ status: 'archived' }))
    expect(archivedResponse.status).toBe(400)
  })

  it('blocks definitive deletion when the patient has related history', async () => {
    const clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: patientId }] })
      .mockResolvedValueOnce({ rows: [{ schema_name: 'public', table_name: 'patient_records', column_name: 'patient_id' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
    jest.mocked(withTransaction).mockImplementation(async (callback) => callback({
      query: clientQuery,
      release: jest.fn(),
    } as unknown as TransactionClient))
    const response = await DELETE(putRequest({}))
    const payload = await response.json()
    expect(response.status).toBe(409)
    expect(payload.error).toContain('Inative')
  })

  it('does not allow non-admin users to delete patients', async () => {
    jest.mocked(requireAuth).mockResolvedValueOnce({ ...user, role: 'therapist' } as Awaited<ReturnType<typeof requireAuth>>)
    const response = await DELETE(putRequest({}))
    expect(response.status).toBe(403)
    expect(withTransaction).not.toHaveBeenCalled()
  })
})
