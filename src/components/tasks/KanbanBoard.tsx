'use client'

import { useState } from 'react'
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useTasksQuery, useProjectsQuery, type Task } from '@/hooks/use-projects-data'
import { useCreateTaskMutation, useDeleteTaskMutation, useUpdateTaskMutation } from '@/hooks/use-project-mutations'
import { useTeamMembersQuery } from '@/hooks/use-team-data'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const columns: Array<{ id: Task['status']; title: string }> = [
  { id: 'todo', title: 'A fazer' }, { id: 'in_progress', title: 'Em andamento' },
  { id: 'review', title: 'Em revisão' }, { id: 'done', title: 'Concluídas' },
]
const emptyForm = { title: '', description: '', status: 'todo' as Task['status'], priority: 'medium' as Task['priority'], project_id: '', assigned_to: '', due_date: '' }

export default function KanbanBoard() {
  const { data: tasks = [], isLoading, error } = useTasksQuery()
  const { data: projects = [] } = useProjectsQuery()
  const { data: members = [] } = useTeamMembersQuery()
  const createTask = useCreateTaskMutation()
  const updateTask = useUpdateTaskMutation()
  const deleteTask = useDeleteTaskMutation()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState(emptyForm)

  const openForm = (task?: Task) => {
    setEditing(task || null)
    setForm(task ? { title: task.title, description: task.description || '', status: task.status, priority: task.priority, project_id: task.project_id || '', assigned_to: task.assigned_to || '', due_date: task.due_date?.slice(0, 10) || '' } : emptyForm)
    setOpen(true)
  }
  const save = () => {
    const payload = { ...form, project_id: form.project_id || undefined, assigned_to: form.assigned_to || undefined, due_date: form.due_date || undefined }
    const mutation = editing ? updateTask : createTask
    mutation.mutate({ ...(editing ? { id: editing.id } : {}), ...payload } as any, { onSuccess: () => setOpen(false) })
  }

  if (isLoading) return <div className="flex h-64 items-center justify-center">Carregando tarefas...</div>
  if (error) return <div className="p-6 text-destructive">{error.message}</div>

  return <div className="space-y-4 p-4">
    <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="mr-2 h-4 w-4" />Nova tarefa</Button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((column) => <section key={column.id} className="min-h-48 rounded-md border bg-muted/30 p-3">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{column.title}</h2><Badge variant="secondary">{tasks.filter((t) => t.status === column.id).length}</Badge></div>
        <div className="space-y-3">{tasks.filter((task) => task.status === column.id).map((task) => <Card key={task.id} className="cursor-pointer p-3 hover:border-primary" onClick={() => openForm(task)}>
          <div className="mb-2 flex items-start justify-between gap-2"><h3 className="text-sm font-medium">{task.title}</h3><Badge variant="outline" className="text-xs">{task.priority}</Badge></div>
          {task.description && <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
          <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}</span><div className="flex" onClick={(event) => event.stopPropagation()}>
            <Button title={task.status === 'done' ? 'Reabrir' : 'Concluir'} size="sm" variant="ghost" className="h-7 px-2" onClick={() => updateTask.mutate({ id: task.id, status: task.status === 'done' ? 'todo' : 'done' })}><RotateCcw className="h-3.5 w-3.5" /></Button>
            <Button title="Excluir" size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => window.confirm('Excluir esta tarefa?') && deleteTask.mutate(task.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div></div>
        </Card>)}</div>
      </section>)}
    </div>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle></DialogHeader>
      <div className="grid gap-4"><Field label="Título *"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Descrição"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2">
        <Field label="Situação"><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Task['status'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{columns.map((column) => <SelectItem key={column.id} value={column.id}>{column.title}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Prioridade"><Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task['priority'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="urgent">Urgente</SelectItem></SelectContent></Select></Field>
        <Field label="Projeto"><Select value={form.project_id || 'none'} onValueChange={(v) => setForm({ ...form, project_id: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem projeto</SelectItem>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Responsável"><Select value={form.assigned_to || 'none'} onValueChange={(v) => setForm({ ...form, assigned_to: v === 'none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não atribuído</SelectItem>{members.filter((m) => m.is_active).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Prazo"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
      </div></div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={!form.title.trim() || createTask.isPending || updateTask.isPending} onClick={save}>Salvar tarefa</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}
