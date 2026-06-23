import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { query, queryOne } from '@/lib/db-neon'
import { GET, POST } from './route'

jest.mock('@/lib/auth-server', () => ({ requireAuth: jest.fn() }))
jest.mock('@/lib/db-neon', () => ({ query: jest.fn(), queryOne: jest.fn() }))

const user = { id: 'user-1', clinic_id: 'clinic-1', role: 'mentor' as const }
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

function postRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest
}

describe('exercise collection API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(requireAuth).mockResolvedValue(user as Awaited<ReturnType<typeof requireAuth>>)
  })

  it('lists only exercises from the authenticated clinic', async () => {
    jest.mocked(query).mockResolvedValue([])
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(jest.mocked(query).mock.calls[0]?.[1]).toEqual([user.clinic_id])
    expect(body.permissions.canEdit).toBe(true)
  })

  it('validates the payload before inserting', async () => {
    const response = await POST(postRequest({ ...payload, name: '', difficulty_level: 9 }))
    expect(response.status).toBe(400)
    expect(queryOne).not.toHaveBeenCalled()
  })

  it('persists a new exercise with user and clinic ownership', async () => {
    jest.mocked(queryOne).mockResolvedValue({ id: 'exercise-1', ...payload })
    const response = await POST(postRequest(payload))

    expect(response.status).toBe(201)
    const values = jest.mocked(queryOne).mock.calls[0]?.[1]
    expect(values?.[10]).toBe(user.id)
    expect(values?.[11]).toBe(user.clinic_id)
  })

  it('blocks write access for a guest', async () => {
    jest.mocked(requireAuth).mockResolvedValueOnce({ ...user, role: 'guest' } as Awaited<ReturnType<typeof requireAuth>>)
    const response = await POST(postRequest(payload))
    expect(response.status).toBe(403)
    expect(queryOne).not.toHaveBeenCalled()
  })
})
