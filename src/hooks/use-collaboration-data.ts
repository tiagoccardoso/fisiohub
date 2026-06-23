import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchJson } from '@/lib/api-client'

export interface Comment { id: string; user_id: string; user_name: string; user_avatar?: string; content: string; created_at: string; updated_at?: string; replies?: Comment[]; is_pinned?: boolean; document_id: string; selection_text?: string; parent_id?: string }
export interface Version { id: string; user_id: string; user_name: string; created_at: string; changes_summary: string; content_preview: string; is_current: boolean; document_id: string }
const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)

export function useCommentsQuery(documentId: string) {
  return useQuery<Comment[], Error>({ queryKey: ['comments', documentId], queryFn: () => fetchJson(`/api/collaboration/comments?document_id=${documentId}`), enabled: validId(documentId), staleTime: 30_000 })
}
export function useAddCommentMutation() {
  const client = useQueryClient()
  return useMutation<Comment, Error, { document_id: string; content: string; parent_id?: string }>({
    mutationFn: (input) => fetchJson('/api/collaboration/comments', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (_, input) => { client.invalidateQueries({ queryKey: ['comments', input.document_id] }); toast.success('Comentário publicado!') }, onError: (e) => toast.error(e.message),
  })
}
export function useUpdateCommentMutation() {
  const client = useQueryClient()
  return useMutation<unknown, Error, { id: string; document_id: string; content?: string; is_pinned?: boolean }>({
    mutationFn: ({ id, document_id: _, ...input }) => fetchJson(`/api/collaboration/comments/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: (_, input) => { client.invalidateQueries({ queryKey: ['comments', input.document_id] }); toast.success('Comentário atualizado!') }, onError: (e) => toast.error(e.message),
  })
}
export function useDeleteCommentMutation() {
  const client = useQueryClient()
  return useMutation<unknown, Error, { id: string; document_id: string }>({
    mutationFn: ({ id }) => fetchJson(`/api/collaboration/comments/${id}`, { method: 'DELETE' }),
    onSuccess: (_, input) => { client.invalidateQueries({ queryKey: ['comments', input.document_id] }); toast.success('Comentário excluído!') }, onError: (e) => toast.error(e.message),
  })
}
export function useVersionsQuery(documentId: string) {
  return useQuery<Version[], Error>({ queryKey: ['versions', documentId], queryFn: () => fetchJson(`/api/collaboration/versions?document_id=${documentId}`), enabled: validId(documentId), staleTime: 30_000 })
}
export function useRestoreVersionMutation() {
  const client = useQueryClient()
  return useMutation<unknown, Error, { versionId: string; documentId: string }>({
    mutationFn: ({ versionId }) => fetchJson(`/api/collaboration/versions/${versionId}/restore`, { method: 'POST' }),
    onSuccess: (_, input) => { client.invalidateQueries({ queryKey: ['versions', input.documentId] }); client.invalidateQueries({ queryKey: ['notebooks'] }); client.invalidateQueries({ queryKey: ['projects'] }); toast.success('Versão restaurada!') }, onError: (e) => toast.error(e.message),
  })
}
export function useActiveUsersSubscription(_documentId: string) {
  return useQuery<any[], Error>({ queryKey: ['active-users'], queryFn: async () => [], staleTime: Infinity })
}
