import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '@/lib/api-client'

export interface TeamMember { id: string; full_name: string; email: string; role: string; avatar_url?: string }
export interface Project {
  id: string; title: string; description?: string; status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent'; due_date?: string; start_date?: string; progress: number; budget?: number;
  category: 'clinical' | 'research' | 'education' | 'administrative' | 'other'; created_by: string; created_at: string;
  updated_at: string; owner?: TeamMember; tags?: string[]; task_count?: number
}
export interface Task {
  id: string; project_id: string; title: string; description?: string; status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent'; assigned_to?: string; due_date?: string; estimated_hours?: number;
  actual_hours: number; order_index: number; checklist?: { id: string; text: string; completed: boolean }[];
  attachments?: { id: string; name: string; url: string; type: string; size: number }[]; created_by: string;
  created_at: string; updated_at: string; assignee?: TeamMember
}
export interface ProjectStats { total_projects: number; active_projects: number; completed_this_month: number; overdue_projects: number; team_productivity: number; average_completion_time: number }

export function useProjectsQuery() {
  return useQuery<Project[], Error>({ queryKey: ['projects'], queryFn: () => fetchJson('/api/projects'), staleTime: 60_000 })
}
export function useTasksQuery() {
  return useQuery<Task[], Error>({ queryKey: ['tasks'], queryFn: () => fetchJson('/api/tasks'), staleTime: 60_000 })
}
export function useProjectStatsQuery() {
  return useQuery<ProjectStats, Error>({ queryKey: ['projectStats'], queryFn: () => fetchJson('/api/projects?stats=1'), staleTime: 60_000 })
}
