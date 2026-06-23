'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Clock,
  Eye,
  Heart,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExerciseForm } from '@/components/exercises/exercise-form'
import { AppPageShell } from '@/components/layouts/app-page-shell'
import {
  exerciseAnatomicalRegions,
  type Exercise,
  type ExerciseFormData,
  type ExercisePermissions,
} from '@/lib/exercise'

type ViewMode = 'library' | 'create' | 'edit'

type ExerciseListResponse = {
  items: Exercise[]
  permissions: ExercisePermissions
}

const noPermissions: ExercisePermissions = {
  canCreate: false,
  canEdit: false,
  canDelete: false,
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const payload = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.')
  return payload as T
}

function difficultyLabel(level: number) {
  return ['Não definido', 'Muito Fácil', 'Fácil', 'Moderado', 'Difícil', 'Muito Difícil'][level] || 'Não definido'
}

function difficultyColor(level: number) {
  const colors: Record<number, string> = {
    1: 'border-green-200 bg-green-100 text-green-800',
    2: 'border-yellow-200 bg-yellow-100 text-yellow-800',
    3: 'border-orange-200 bg-orange-100 text-orange-800',
    4: 'border-red-200 bg-red-100 text-red-800',
    5: 'border-purple-200 bg-purple-100 text-purple-800',
  }
  return colors[level] || 'border-gray-200 bg-gray-100 text-gray-800'
}

function ExercisesPageContent() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [permissions, setPermissions] = useState<ExercisePermissions>(noPermissions)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('Todos')
  const [viewMode, setViewMode] = useState<ViewMode>('library')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadExercises = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await requestJson<ExerciseListResponse>('/api/exercises', { cache: 'no-store' })
      setExercises(data.items)
      setPermissions(data.permissions)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Erro ao carregar exercícios.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadExercises()
  }, [loadExercises])

  const filteredExercises = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase('pt-BR')
    return exercises.filter((exercise) => {
      const matchesSearch = !search || [exercise.name, exercise.description, exercise.muscle_group]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(search))
      const matchesRegion = selectedRegion === 'Todos' || exercise.anatomical_region === selectedRegion
      return matchesSearch && matchesRegion
    })
  }, [exercises, searchTerm, selectedRegion])

  const handleSaveExercise = async (data: ExerciseFormData) => {
    const editingExercise = viewMode === 'edit' ? selectedExercise : null
    const savedExercise = await requestJson<Exercise>(
      editingExercise ? `/api/exercises/${editingExercise.id}` : '/api/exercises',
      {
        method: editingExercise ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    )

    setExercises((current) => editingExercise
      ? current.map((exercise) => exercise.id === savedExercise.id ? savedExercise : exercise)
      : [...current, savedExercise].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    )
    setSelectedExercise(null)
    setViewMode('library')
  }

  const handleDeleteExercise = async () => {
    if (!exerciseToDelete) return
    setIsDeleting(true)
    try {
      const result = await requestJson<{ message: string }>(`/api/exercises/${exerciseToDelete.id}`, {
        method: 'DELETE',
      })
      setExercises((current) => current.filter((exercise) => exercise.id !== exerciseToDelete.id))
      toast.success(result.message)
      setExerciseToDelete(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir exercício.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <ExerciseForm
          exercise={selectedExercise || undefined}
          onSave={handleSaveExercise}
          onCancel={() => {
            setSelectedExercise(null)
            setViewMode('library')
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca de Exercícios</h1>
          <p className="text-muted-foreground">Consulte e gerencie os exercícios da clínica.</p>
        </div>
        {permissions.canCreate && (
          <Button onClick={() => {
            setSelectedExercise(null)
            setViewMode('create')
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Exercício
          </Button>
        )}
      </div>

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="library">Biblioteca</TabsTrigger>
          <TabsTrigger value="protocols">Protocolos</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescrições</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Buscar exercícios"
                placeholder="Buscar por nome, descrição ou grupo muscular..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Filtrar por região anatômica">
              {['Todos', ...exerciseAnatomicalRegions].map((region) => (
                <Button
                  key={region}
                  variant={selectedRegion === region ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRegion(region)}
                  className="whitespace-nowrap"
                >
                  {region}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={<BookOpen className="h-4 w-4 text-primary" />} label="Total" value={exercises.length} />
            <StatCard icon={<Heart className="h-4 w-4 text-red-500" />} label="Favoritos" value={exercises.filter((item) => item.is_favorite).length} />
            <StatCard icon={<Play className="h-4 w-4 text-green-600" />} label="Com vídeo" value={exercises.filter((item) => item.video_url).length} />
          </div>

          {loadError && (
            <Alert variant="destructive">
              <AlertTitle>Não foi possível carregar os exercícios</AlertTitle>
              <AlertDescription className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{loadError}</span>
                <Button variant="outline" size="sm" onClick={() => void loadExercises()}>
                  <RefreshCw className="mr-2 h-4 w-4" />Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Carregando exercícios">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72 w-full" />)}
            </div>
          ) : !loadError && filteredExercises.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredExercises.map((exercise) => (
                <Card key={exercise.id} className="group transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <CardTitle className="text-lg transition-colors group-hover:text-primary">{exercise.name}</CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{exercise.anatomical_region}</Badge>
                          <Badge variant="outline" className={difficultyColor(exercise.difficulty_level)}>
                            {difficultyLabel(exercise.difficulty_level)}
                          </Badge>
                          <Badge variant="outline">{exercise.category}</Badge>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {exercise.is_favorite && <Heart className="h-4 w-4 fill-current text-red-500" aria-label="Favorito" />}
                        {exercise.video_url && <Play className="h-4 w-4 text-green-600" aria-label="Possui vídeo" />}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-3 text-sm text-muted-foreground">{exercise.description}</p>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {exercise.muscle_group && <InfoLine icon={<Users className="h-3 w-3" />} text={exercise.muscle_group} />}
                      {exercise.duration && <InfoLine icon={<Clock className="h-3 w-3" />} text={`${exercise.duration} segundos`} />}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => setDetailExercise(exercise)}>
                        <Eye className="mr-2 h-4 w-4" />Detalhes
                      </Button>
                      {permissions.canEdit && (
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedExercise(exercise)
                          setViewMode('edit')
                        }}>
                          <Pencil className="mr-2 h-4 w-4" />Editar
                        </Button>
                      )}
                      {permissions.canDelete && (
                        <Button size="icon" variant="outline" aria-label={`Excluir ${exercise.name}`} onClick={() => setExerciseToDelete(exercise)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !loadError && (
            <div className="py-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-medium">Nenhum exercício encontrado</h2>
              <p className="mb-4 text-muted-foreground">
                {exercises.length ? 'Ajuste a busca ou os filtros.' : 'A biblioteca da clínica ainda está vazia.'}
              </p>
              {permissions.canCreate && !exercises.length && (
                <Button onClick={() => setViewMode('create')}><Plus className="mr-2 h-4 w-4" />Criar primeiro exercício</Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="protocols">
          <EmptyTab icon={<BookOpen className="h-12 w-12" />} title="Nenhum protocolo disponível" text="Os protocolos reais cadastrados aparecerão aqui." />
        </TabsContent>
        <TabsContent value="prescriptions">
          <EmptyTab icon={<Users className="h-12 w-12" />} title="Prescrições ativas" text="As prescrições dos pacientes aparecerão aqui." />
        </TabsContent>
      </Tabs>

      <ExerciseDetails exercise={detailExercise} onClose={() => setDetailExercise(null)} />

      <Dialog open={Boolean(exerciseToDelete)} onOpenChange={(open) => !open && !isDeleting && setExerciseToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir exercício</DialogTitle>
            <DialogDescription>
              Confirma a exclusão de <strong>{exerciseToDelete?.name}</strong>? Se houver prescrições vinculadas, o exercício será inativado para preservar o histórico clínico.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={isDeleting} onClick={() => setExerciseToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={isDeleting} onClick={() => void handleDeleteExercise()}>
              {isDeleting ? 'Processando...' : 'Confirmar exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card><CardContent className="flex items-center gap-2 p-4">{icon}<div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>
  )
}

function InfoLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2">{icon}<span className="line-clamp-1">{text}</span></div>
}

function EmptyTab({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="py-12 text-center text-muted-foreground"><div className="mx-auto mb-4 w-fit">{icon}</div><h2 className="mb-2 text-lg font-medium text-foreground">{title}</h2><p>{text}</p></div>
}

function ExerciseDetails({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  if (!exercise) return null
  const details = [
    ['Categoria', exercise.category],
    ['Região anatômica', exercise.anatomical_region],
    ['Dificuldade', difficultyLabel(exercise.difficulty_level)],
    ['Duração sugerida', exercise.duration ? `${exercise.duration} segundos` : 'Não informada'],
    ['Grupo muscular', exercise.muscle_group || 'Não informado'],
    ['Indicações', exercise.indications || 'Não informadas'],
    ['Contraindicações', exercise.contraindications || 'Não informadas'],
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{exercise.name}</DialogTitle><DialogDescription>{exercise.description}</DialogDescription></DialogHeader>
        <dl className="grid gap-4 sm:grid-cols-2">
          {details.map(([label, value]) => <div key={label}><dt className="text-sm font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{value}</dd></div>)}
        </dl>
        {exercise.video_url && <Button variant="outline" asChild><a href={exercise.video_url} target="_blank" rel="noreferrer"><Play className="mr-2 h-4 w-4" />Abrir vídeo demonstrativo</a></Button>}
      </DialogContent>
    </Dialog>
  )
}

export default function ExercisesPage() {
  return <AppPageShell><ExercisesPageContent /></AppPageShell>
}
