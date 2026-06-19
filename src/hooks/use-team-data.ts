import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface TeamMember {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'mentor' | 'intern' | 'guest' | 'professional' | 'therapist' | 'receptionist' | 'student'
  crefito?: string
  phone?: string
  specialty?: string
  university?: string
  semester?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Mentorship {
  id: string
  mentor_id: string
  intern_id: string
  status: 'active' | 'completed' | 'paused'
  start_date: string
  end_date?: string
  hours_completed: number
  hours_required: number
  goals: string[]
  competencies: CompetencyEvaluation[]
  notes: ProgressNote[]
  created_at: string
  mentor?: TeamMember
  intern?: TeamMember
}

export interface CompetencyEvaluation {
  id: string
  competency: string
  level: 1 | 2 | 3 | 4 | 5
  evaluation_date: string
  notes?: string
}

export interface ProgressNote {
  id: string
  date: string
  content: string
  achievements: string[]
  next_steps: string[]
  feedback_type: 'positive' | 'improvement' | 'neutral'
  created_by: string
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error || 'Erro de comunicação com o servidor.')
  return payload as T
}

export function useTeamMembersQuery() {
  return useQuery<TeamMember[], Error>({
    queryKey: ['teamMembers'],
    queryFn: () => fetchJson<TeamMember[]>('/api/team'),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })
}

export function useMentorshipsQuery() {
  return useQuery<Mentorship[], Error>({
    queryKey: ['mentorships'],
    queryFn: () => fetchJson<Mentorship[]>('/api/mentorships'),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })
}

interface AddProgressNoteInput {
  mentorship_id: string
  content: string
  achievements: string[]
  next_steps: string[]
  feedback_type: ProgressNote['feedback_type']
}

export function useAddProgressNoteMutation() {
  const queryClient = useQueryClient()

  return useMutation<ProgressNote, Error, AddProgressNoteInput>({
    mutationFn: (newNoteData) =>
      fetchJson<ProgressNote>('/api/mentorships/progress-notes', {
        method: 'POST',
        body: JSON.stringify(newNoteData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorships'] })
      toast.success('Nota de progresso adicionada!')
    },
    onError: (error) => {
      toast.error('Erro ao adicionar nota de progresso: ' + error.message)
    },
  })
}

interface UpdateCompetencyInput {
  mentorship_id: string
  competency_id: string
  competency: string
  level: CompetencyEvaluation['level']
  notes?: string
}

interface CreateCompetencyInput {
  mentorship_id: string
  competency: string
  level: CompetencyEvaluation['level']
  notes?: string
}

export function useUpsertCompetencyMutation() {
  const queryClient = useQueryClient()

  return useMutation<CompetencyEvaluation, Error, UpdateCompetencyInput | CreateCompetencyInput>({
    mutationFn: (competencyData) =>
      fetchJson<CompetencyEvaluation>('/api/mentorships/competencies', {
        method: 'POST',
        body: JSON.stringify(competencyData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorships'] })
      toast.success('Competência atualizada com sucesso!')
    },
    onError: (error) => {
      toast.error('Erro ao atualizar competência: ' + error.message)
    },
  })
}
