import { useQuery } from '@tanstack/react-query'

export interface DashboardStats {
  totalNotebooks: number
  totalProjects: number
  totalTasks: number
  completedTasks: number
  totalTeamMembers: number
  activeInterns: number
  upcomingEvents: number
  activeMentorships: number
  completionRate: number
}

export interface RecentActivity {
  id: string
  action: string
  resource_type: string
  user_id: string
  created_at: string
  user?: {
    full_name: string
    avatar_url?: string
  }
}

export interface UpcomingEvent {
  id: string
  title: string
  type: 'supervision' | 'appointment' | 'meeting' | 'evaluation'
  scheduled_for: string
  participants?: string[]
}

const fetchDashboardData = async (): Promise<{
  stats: DashboardStats
  activities: RecentActivity[]
  events: UpcomingEvent[]
}> => {
  const response = await fetch('/api/dashboard', { cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'Falha ao carregar o dashboard.')
  }

  return payload
}

export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  })
}

export const useDashboardQuery = useDashboardData
