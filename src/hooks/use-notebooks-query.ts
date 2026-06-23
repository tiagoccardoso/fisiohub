import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/lib/api-client'

export interface Notebook {
  id: string
  title: string
  description: string | null
  content: string
  template_type: string | null
  page_count: number
  created_at: string
  updated_at: string
  owner_id: string
  owner?: { full_name: string; email: string }
  is_public?: boolean
}

export function useNotebooksQuery() {
  return useQuery<Notebook[], Error>({
    queryKey: ['notebooks'],
    queryFn: () => fetchJson<Notebook[]>('/api/notebooks'),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
