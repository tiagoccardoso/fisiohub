import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchJson } from '@/lib/api-client'
import type { Notebook } from './use-notebooks-query'

interface NotebookInput {
  title: string
  description?: string
  content?: string
  template_type?: string
  icon?: string
  color?: string
  category?: string
  is_public?: boolean
}

function useRefresh() {
  const client = useQueryClient()
  return () => {
    client.invalidateQueries({ queryKey: ['notebooks'] })
    client.invalidateQueries({ queryKey: ['dashboard-data'] })
  }
}

export function useCreateNotebookMutation() {
  const refresh = useRefresh()
  return useMutation<Notebook, Error, NotebookInput>({
    mutationFn: (input) => fetchJson('/api/notebooks', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => { refresh(); toast.success('Caderno criado com sucesso!') },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateNotebookMutation() {
  const refresh = useRefresh()
  return useMutation<Notebook, Error, NotebookInput & { id: string }>({
    mutationFn: ({ id, ...input }) => fetchJson(`/api/notebooks/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => { refresh(); toast.success('Caderno atualizado com sucesso!') },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteNotebookMutation() {
  const refresh = useRefresh()
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: (id) => fetchJson(`/api/notebooks/${id}`, { method: 'DELETE' }),
    onSuccess: () => { refresh(); toast.success('Caderno excluído com sucesso!') },
    onError: (error) => toast.error(error.message),
  })
}
