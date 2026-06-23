'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderKanban } from 'lucide-react'
import { useNotebooksQuery } from '@/hooks/use-notebooks-query'
import { useProjectsQuery } from '@/hooks/use-projects-data'
import { CollaborationPanel } from '@/components/ui/collaboration-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function CollaborationWorkspace() {
  const { data: notebooks = [], isLoading: loadingNotebooks } = useNotebooksQuery()
  const { data: projects = [], isLoading: loadingProjects } = useProjectsQuery()
  const documents = useMemo(() => [
    ...notebooks.map((item) => ({ id: item.id, title: item.title, description: item.description, content: item.content, type: 'notebook' as const })),
    ...projects.map((item) => ({ id: item.id, title: item.title, description: item.description, content: '', type: 'project' as const })),
  ], [notebooks, projects])
  const [selectedId, setSelectedId] = useState('')
  useEffect(() => { if (!selectedId && documents[0]) setSelectedId(documents[0].id) }, [documents, selectedId])
  const selected = documents.find((item) => item.id === selectedId)

  return <div className="container mx-auto max-w-7xl space-y-6 p-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-bold">Colaboração</h1><p className="text-muted-foreground">Comentários e histórico dos documentos reais da clínica</p></div><Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Selecione um documento" /></SelectTrigger><SelectContent>{documents.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select></div>
    {(loadingNotebooks || loadingProjects) ? <div className="py-16 text-center">Carregando documentos...</div> : !selected ? <Card><CardContent className="py-16 text-center text-muted-foreground">Crie um caderno ou projeto para iniciar uma colaboração.</CardContent></Card> : <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2">{selected.type === 'notebook' ? <FileText className="h-5 w-5" /> : <FolderKanban className="h-5 w-5" />}{selected.title}</CardTitle></CardHeader><CardContent><p className="mb-5 text-sm text-muted-foreground">{selected.description || 'Sem descrição.'}</p>{selected.content ? <iframe title={`Conteúdo de ${selected.title}`} sandbox="" srcDoc={selected.content} className="min-h-[480px] w-full rounded-md border bg-white" /> : <p className="text-sm text-muted-foreground">Use os comentários para registrar atualizações e decisões deste projeto.</p>}</CardContent></Card>
      <CollaborationPanel documentId={selected.id} documentTitle={selected.title} />
    </div>}
  </div>
}
