import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { queryOne } from '@/lib/db-neon'
import { PUT } from './route'

jest.mock('@/lib/auth-server', () => ({ requireAuth: jest.fn() }))
jest.mock('@/lib/db-neon', () => ({ execute: jest.fn(), queryOne: jest.fn() }))

const user = { id: 'user-1', clinic_id: 'clinic-1' }
const patientId = '7f95a9a4-87f1-4a29-93df-9763d3320dbe'

function putRequest(body: Record<string, unknown>) {
  return {
    url: `http://localhost/api/patients/${patientId}`,
    json: async () => body,
  } as unknown as NextRequest
}

describe('patient update API', () => {
  beforeEach(() => {
    jest.mocked(requireAuth).mockResolvedValue(user as Awaited<ReturnType<typeof requireAuth>>)
  })

  it.each(['', '529.982.247-2', '529.982.247-24'])(
    'does not allow an empty, incomplete or invalid CPF to replace the current value: %s',
    async (cpf) => {
      const response = await PUT(putRequest({ cpf }))
      expect(response.status).toBe(400)
      expect(queryOne).not.toHaveBeenCalled()
    }
  )

  it('normalizes CPF and checks duplicates only in the authenticated clinic', async () => {
    jest.mocked(queryOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: patientId, cpf: '52998224725' })

    const response = await PUT(putRequest({ cpf: '529.982.247-25' }))

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

    const response = await PUT(putRequest({ cpf: '529.982.247-25' }))
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('CPF já cadastrado nesta clínica.')
  })
})
