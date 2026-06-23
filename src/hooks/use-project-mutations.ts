import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchJson } from '@/lib/api-client'
import type { Project, Task } from './use-projects-data'

type ProjectInput = Pick<Project, 'title' | 'status' | 'priority' | 'category'> & Partial<Pick<Project, 'description' | 'due_date' | 'start_date' | 'budget' | 'tags' | 'progress'>>
type TaskInput = Pick<Task, 'title' | 'status' | 'priority'> & Partial<Pick<Task, 'project_id' | 'description' | 'assigned_to' | 'due_date' | 'estimated_hours' | 'actual_hours' | 'order_index' | 'checklist' | 'attachments'>>

function useRefresh() {
  const client = useQueryClient()
  return () => {
    for (const key of ['projects', 'projectStats', 'tasks', 'dashboard-data']) client.invalidateQueries({ queryKey: [key] })
  }
}
export function useCreateProjectMutation() {
  const refresh = useRefresh()
  return useMutation<Project, Error, ProjectInput>({ mutationFn: (input) => fetchJson('/api/projects', { method: 'POST', body: JSON.stringify(input) }), onSuccess: () => { refresh(); toast.success('Projeto criado com sucesso!') }, onError: (e) => toast.error(e.message) })
}
export function useUpdateProjectMutation() {
  const refresh = useRefresh()
  return useMutation<Project, Error, Partial<ProjectInput> & { id: string }>({ mutationFn: ({ id, ...input }) => fetchJson(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(input) }), onSuccess: () => { refresh(); toast.success('Projeto atualizado!') }, onError: (e) => toast.error(e.message) })
}
export function useDeleteProjectMutation() {
  const refresh = useRefresh()
  return useMutation<{ ok: true }, Error, string>({ mutationFn: (id) => fetchJson(`/api/projects/${id}`, { method: 'DELETE' }), onSuccess: () => { refresh(); toast.success('Projeto excluído!') }, onError: (e) => toast.error(e.message) })
}
export function useCreateTaskMutation() {
  const refresh = useRefresh()
  return useMutation<Task, Error, TaskInput>({ mutationFn: (input) => fetchJson('/api/tasks', { method: 'POST', body: JSON.stringify(input) }), onSuccess: () => { refresh(); toast.success('Tarefa criada!') }, onError: (e) => toast.error(e.message) })
}
export function useUpdateTaskMutation() {
  const refresh = useRefresh()
  return useMutation<Task, Error, Partial<TaskInput> & { id: string }>({ mutationFn: (input) => fetchJson('/api/tasks', { method: 'PUT', body: JSON.stringify(input) }), onSuccess: () => { refresh(); toast.success('Tarefa atualizada!') }, onError: (e) => toast.error(e.message) })
}
export function useDeleteTaskMutation() {
  const refresh = useRefresh()
  return useMutation<{ ok: true }, Error, string>({ mutationFn: (id) => fetchJson(`/api/tasks?id=${id}`, { method: 'DELETE' }), onSuccess: () => { refresh(); toast.success('Tarefa excluída!') }, onError: (e) => toast.error(e.message) })
}
