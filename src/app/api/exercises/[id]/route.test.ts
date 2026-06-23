import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { queryOne, withTransaction } from '@/lib/db-neon'
import type { TransactionClient } from '@/lib/db-neon'
import { DELETE, GET, PUT } from './route'

jest.mock('@/lib/auth-server', () => ({ requireAuth: jest.fn() }))
jest.mock('@/lib/db-neon', () => ({ queryOne: jest.fn(), withTransaction: jest.fn() }))

const user = { id: 'user-1', clinic_id: 'clinic-1', role: 'admin' as const }
const exerciseId = '7f95a9a4-87f1-4a29-93df-9763d3320dbe'
const payload = {
  name: 'Rotação cervical',
  description: 'Movimento cervical lento e controlado.',
  category: 'Mobilidade',
  anatomical_region: 'Cervical',
  video_url: '',
  difficulty_level: 2,
  duration: 30,
  muscle_group: 'Músculos cervicais',
  indications: 'Rigidez cervical',
  contraindications: 'Vertigem severa',
  is_favorite: false,
}

function request(body?: Record<string, unknown>) {
  return {
    url: `http://localhost/api/exercises/${exerciseId}`,
    json: async () => body || {},
  } as unknown as NextRequest
}

describe('exercise item API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(requireAuth).mockResolvedValue(user as Awaited<ReturnType<typeof requireAuth>>)
  })

  it('does not expose an exercise from another clinic', async () => {
    jest.mocked(queryOne).mockResolvedValue(null)
    const response = await GET(request())
    expect(response.status).toBe(404)
    expect(jest.mocked(queryOne).mock.calls[0]?.[1]).toEqual([exerciseId, user.clinic_id])
  })

  it('updates only inside the authenticated clinic', async () => {
    jest.mocked(queryOne).mockResolvedValue({ id: exerciseId, ...payload })
    const response = await PUT(request(payload))
    const values = jest.mocked(queryOne).mock.calls[0]?.[1]

    expect(response.status).toBe(200)
    expect(values?.[0]).toBe(exerciseId)
    expect(values?.[12]).toBe(user.clinic_id)
  })

  it('inactivates an exercise that is already used in a prescription', async () => {
    const clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: exerciseId }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [] })
    jest.mocked(withTransaction).mockImplementation(async (callback) => callback({
      query: clientQuery,
      release: jest.fn(),
    } as unknown as TransactionClient))

    const response = await DELETE(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.action).toBe('archived')
    expect(clientQuery.mock.calls[2]?.[0]).toContain('is_active = false')
    expect(clientQuery.mock.calls[2]?.[1]).toEqual([exerciseId, user.clinic_id])
  })

  it('physically deletes an unlinked exercise', async () => {
    const clientQuery = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: exerciseId }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] })
    jest.mocked(withTransaction).mockImplementation(async (callback) => callback({
      query: clientQuery,
      release: jest.fn(),
    } as unknown as TransactionClient))

    const response = await DELETE(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.action).toBe('deleted')
    expect(clientQuery.mock.calls[2]?.[0]).toContain('delete from public.exercise_library')
  })

  it('blocks deletion for roles that do not manage the exercise library', async () => {
    jest.mocked(requireAuth).mockResolvedValueOnce({ ...user, role: 'therapist' } as Awaited<ReturnType<typeof requireAuth>>)
    const response = await DELETE(request())
    expect(response.status).toBe(403)
    expect(withTransaction).not.toHaveBeenCalled()
  })
})
