'use client'

import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchJson } from '@/lib/api-client'

export interface CalendarEvent {
  id: string; title: string; description?: string; start_time: string; end_time: string;
  event_type: 'appointment' | 'supervision' | 'meeting' | 'break'; status?: string; location?: string;
  attendees: string[]; created_by: string; created_at: string; updated_at: string
}
export interface CreateEventData { title: string; description?: string; start_time: string; end_time: string; event_type: CalendarEvent['event_type']; location?: string; attendees?: string[] }
export interface UpdateEventData extends Partial<CreateEventData> { id: string }

const normalize = <T extends CreateEventData>(event: T) => ({
  ...event,
  start_time: new Date(event.start_time).toISOString(),
  end_time: new Date(event.end_time).toISOString(),
  attendees: event.attendees || [],
})

export function useCalendarEvents() {
  return useQuery<CalendarEvent[], Error>({ queryKey: ['calendar-events'], queryFn: () => fetchJson('/api/calendar-events'), staleTime: 30_000 })
}
export function useCalendarEventsByRange(startDate: Date, endDate: Date) {
  return useQuery<CalendarEvent[], Error>({
    queryKey: ['calendar-events', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => fetchJson(`/api/calendar-events?start=${encodeURIComponent(startDate.toISOString())}&end=${encodeURIComponent(endDate.toISOString())}`),
    staleTime: 30_000,
  })
}
function useInvalidate() {
  const client = useQueryClient()
  return () => { client.invalidateQueries({ queryKey: ['calendar-events'] }); client.invalidateQueries({ queryKey: ['dashboard-data'] }); client.invalidateQueries({ queryKey: ['analyticsSummary'] }) }
}
export function useCreateEvent() {
  const invalidate = useInvalidate()
  return useMutation<CalendarEvent, Error, CreateEventData>({ mutationFn: (input) => fetchJson('/api/calendar-events', { method: 'POST', body: JSON.stringify(normalize(input)) }), onSuccess: () => { invalidate(); toast.success('Evento criado com sucesso!') }, onError: (e) => toast.error(e.message) })
}
export function useUpdateEvent() {
  const invalidate = useInvalidate()
  return useMutation<CalendarEvent, Error, UpdateEventData>({
    mutationFn: ({ id, ...input }) => fetchJson(`/api/calendar-events/${id}`, { method: 'PUT', body: JSON.stringify(normalize(input as CreateEventData)) }),
    onSuccess: () => { invalidate(); toast.success('Evento atualizado com sucesso!') }, onError: (e) => toast.error(e.message),
  })
}
export function useDeleteEvent() {
  const invalidate = useInvalidate()
  return useMutation<{ ok: true }, Error, string>({ mutationFn: (id) => fetchJson(`/api/calendar-events/${id}`, { method: 'DELETE' }), onSuccess: () => { invalidate(); toast.success('Evento excluído!') }, onError: (e) => toast.error(e.message) })
}
export function useUsers() {
  return useQuery<Array<{ id: string; full_name: string; email: string; avatar_url?: string; role: string; is_active?: boolean }>, Error>({ queryKey: ['calendar-users'], queryFn: async () => (await fetchJson<Array<{ id: string; full_name: string; email: string; avatar_url?: string; role: string; is_active?: boolean }>>('/api/team')).filter((user) => user.is_active !== false), staleTime: 60_000 })
}
export function useRealtimeEvents() {
  const client = useQueryClient()
  React.useEffect(() => {
    const timer = window.setInterval(() => client.invalidateQueries({ queryKey: ['calendar-events'] }), 60_000)
    return () => window.clearInterval(timer)
  }, [client])
}
export function useEventStats() {
  const { data = [] } = useCalendarEvents()
  return { data: { total: data.length, byType: data.reduce<Record<string, number>>((acc, event) => { acc[event.event_type] = (acc[event.event_type] || 0) + 1; return acc }, {}) } }
}
