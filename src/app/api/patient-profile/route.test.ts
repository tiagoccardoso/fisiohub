import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne, withTransaction } from '@/lib/db-neon'
import type { TransactionClient } from '@/lib/db-neon'
import { GET, POST } from './route'

jest.mock('@/lib/auth-server', () => ({ requireAuth: jest.fn() }))
jest.mock('@/lib/db-neon', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  withTransaction: jest.fn(),
}))

const user = { id: 'user-1', clinic_id: 'clinic-1', role: 'admin' as const }
const patientId = '7f95a9a4-87f1-4a29-93df-9763d3320dbe'

function getRequest() {
  return { nextUrl: new URL(`http://localhost/api/patient-profile?patientId=${patientId}`) } as unknown as NextRequest
}

function postRequest() {
  return {
    json: async () => ({
      patientId,
      age: 45,
      condition: 'lombalgia',
      severity: 'moderate',
      painLevel: 6,
      lifestyle: 'active',
    }),
  } as unknown as NextRequest
}

describe('patient profile API', () => {
  beforeEach(() => {
    jest.mocked(requireAuth).mockResolvedValue(user as Awaited<ReturnType<typeof requireAuth>>)
  })

  it('loads only the selected patient history from the authenticated clinic', async () => {
    jest.mocked(queryOne)
      .mockResolvedValueOnce({ id: patientId, full_name: 'Paciente Teste', birth_date: '1980-01-01' })
      .mockResolvedValueOnce({ id: 'profile-1', patient_id: patientId })
    jest.mocked(query).mockResolvedValue([{ id: 'history-1', patient_id: patientId }])

    const response = await GET(getRequest())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.history).toHaveLength(1)
    expect(jest.mocked(query).mock.calls[0]?.[1]).toEqual([patientId, user.clinic_id])
  })

  it('updates the current profile and appends a separate history entry', async () => {
    const clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: patientId }] })
      .mockResolvedValueOnce({ rows: [{ id: 'profile-1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'history-1' }] })

    jest.mocked(withTransaction).mockImplementation(async (callback) => callback({
      query: clientQuery,
      release: jest.fn(),
    } as unknown as TransactionClient))

    const response = await POST(postRequest())

    expect(response.status).toBe(201)
    expect(clientQuery).toHaveBeenCalledTimes(3)
    expect(clientQuery.mock.calls[0]?.[1]).toEqual([patientId, user.clinic_id])
    expect(clientQuery.mock.calls[2]?.[1]).toEqual([
      patientId,
      user.clinic_id,
      45,
      'lombalgia',
      'moderate',
      6,
      'active',
      user.id,
    ])
  })

  it('does not write a profile when the patient is outside the clinic', async () => {
    const clientQuery = jest.fn().mockResolvedValueOnce({ rows: [] })
    jest.mocked(withTransaction).mockImplementation(async (callback) => callback({
      query: clientQuery,
      release: jest.fn(),
    } as unknown as TransactionClient))

    const response = await POST(postRequest())

    expect(response.status).toBe(404)
    expect(clientQuery).toHaveBeenCalledTimes(1)
  })
})
