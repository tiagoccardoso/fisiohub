'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertCircle, CheckCircle, Clock, Plus, Save, Search, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { AppPageShell } from '@/components/layouts/app-page-shell'
import { PatientForm } from '@/components/patients/patient-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/use-debounce'
import { usePatients } from '@/hooks/use-patients'
import { PatientProfileRecord } from '@/lib/patient-profile'
import { CreatedPatient } from '@/lib/patient'
import { AIEngine, AIRecommendation, PatientProfile } from '@/services/ai'

type PatientOption = {
  id: string
  full_name: string
  birth_date: string | null
}

type ProfileResponse = {
  patient: PatientOption
  current: PatientProfileRecord | null
  history: PatientProfileRecord[]
}

type ProfileForm = {
  age: string
  condition: string
  severity: string
  painLevel: string
  lifestyle: string
}

const emptyForm: ProfileForm = {
  age: '',
  condition: '',
  severity: '',
  painLevel: '',
  lifestyle: '',
}

const conditionLabels: Record<string, string> = {
  lombalgia: 'Lombalgia',
  cervicalgia: 'Cervicalgia',
  ombro: 'Ombro',
  joelho: 'Joelho',
}

const severityLabels: Record<string, string> = {
  mild: 'Leve',
  moderate: 'Moderada',
  severe: 'Severa',
}

const lifestyleLabels: Record<string, string> = {
  sedentary: 'Sedentário',
  active: 'Ativo',
  very_active: 'Muito ativo',
}

function calculateAge(birthDate: string | null) {
  if (!birthDate) return ''
  const birth = new Date(`${birthDate.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return ''

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDifference = today.getMonth() - birth.getMonth()
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) age -= 1
  return String(age)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function PatientProfilePageContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [patientId, setPatientId] = useState('')
  const [form, setForm] = useState<ProfileForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)
  const { data: patients = [], isLoading: patientsLoading, error: patientsError } = usePatients(debouncedSearch)

  const profileQuery = useQuery<ProfileResponse>({
    queryKey: ['patient-profile', patientId],
    enabled: Boolean(patientId),
    queryFn: async () => {
      const response = await fetch(`/api/patient-profile?patientId=${encodeURIComponent(patientId)}`, {
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Falha ao carregar o perfil do paciente.')
      return payload
    },
  })

  useEffect(() => {
    if (!profileQuery.data) return
    const current = profileQuery.data.current
    setForm(current ? {
      age: String(current.age),
      condition: current.condition,
      severity: current.severity,
      painLevel: String(current.pain_level),
      lifestyle: current.lifestyle,
    } : {
      ...emptyForm,
      age: calculateAge(profileQuery.data.patient.birth_date),
    })
    setSaveError('')
  }, [profileQuery.data])

  const completedFields = useMemo(
    () => Object.values(form).filter((value) => value !== '').length,
    [form]
  )

  const isComplete = completedFields === 5

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setSaveError('')
    setRecommendation(null)
  }

  const handlePatientChange = (value: string) => {
    setPatientId(value)
    setForm(emptyForm)
    setSaveError('')
    setRecommendation(null)
  }

  const handlePatientCreated = (patient: CreatedPatient) => {
    setSearchTerm('')
    setPatientId(patient.id)
    setForm({ ...emptyForm, age: calculateAge(patient.birth_date) })
    setSaveError('')
    setRecommendation(null)
    setIsPatientFormOpen(false)
  }

  const handleGenerateRecommendation = () => {
    if (!isComplete) return
    const profile: PatientProfile = {
      age: Number(form.age),
      condition: form.condition,
      severity: form.severity as PatientProfile['severity'],
      painLevel: Number(form.painLevel),
      lifestyle: form.lifestyle as PatientProfile['lifestyle'],
    }
    setRecommendation(AIEngine.generateRecommendation(profile))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!patientId || !isComplete) return

    setIsSaving(true)
    setSaveError('')
    try {
      const response = await fetch('/api/patient-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          age: Number(form.age),
          condition: form.condition,
          severity: form.severity,
          painLevel: Number(form.painLevel),
          lifestyle: form.lifestyle,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Não foi possível salvar o perfil.')

      toast.success('Perfil do paciente salvo com sucesso.')
      await profileQuery.refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o perfil.'
      setSaveError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-1 sm:gap-6 sm:p-2 lg:p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perfil do Paciente</h1>
        <p className="mt-1 text-muted-foreground">
          Registre os dados clínicos utilizados nas recomendações e consulte as avaliações anteriores.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Paciente
            </CardTitle>
            <Button type="button" onClick={() => setIsPatientFormOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar novo paciente
            </Button>
          </div>
          <CardDescription>Selecione um paciente da clínica para visualizar ou atualizar o perfil.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filtrar pacientes por nome"
              className="pl-10"
            />
          </div>

          <div className="max-w-xl space-y-2">
            <Label htmlFor="patient">Paciente</Label>
            <Select value={patientId} onValueChange={handlePatientChange} disabled={patientsLoading}>
              <SelectTrigger id="patient">
                <SelectValue placeholder={patientsLoading ? 'Carregando pacientes...' : 'Selecione um paciente'} />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient: PatientOption) => (
                  <SelectItem key={patient.id} value={patient.id}>{patient.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {patientsError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar pacientes</AlertTitle>
              <AlertDescription>{patientsError instanceof Error ? patientsError.message : 'Tente novamente.'}</AlertDescription>
            </Alert>
          )}

          {!patientsLoading && !patientsError && patients.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
          )}
        </CardContent>
      </Card>

      {!patientId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecione um paciente para abrir o perfil e o histórico.
          </CardContent>
        </Card>
      ) : profileQuery.isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Skeleton className="h-[480px] w-full" />
          <Skeleton className="h-[480px] w-full" />
        </div>
      ) : profileQuery.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível abrir o perfil</AlertTitle>
          <AlertDescription>
            {profileQuery.error instanceof Error ? profileQuery.error.message : 'Tente novamente.'}
          </AlertDescription>
        </Alert>
      ) : profileQuery.data ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Dados do perfil
              </CardTitle>
              <CardDescription>{profileQuery.data.patient.full_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="age">Idade</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="130"
                      required
                      value={form.age}
                      onChange={(event) => updateField('age', event.target.value)}
                      placeholder="Ex.: 45"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condição</Label>
                    <Select value={form.condition} onValueChange={(value) => updateField('condition', value)}>
                      <SelectTrigger id="condition"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lombalgia">Lombalgia</SelectItem>
                        <SelectItem value="cervicalgia">Cervicalgia</SelectItem>
                        <SelectItem value="ombro">Ombro</SelectItem>
                        <SelectItem value="joelho">Joelho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severidade</Label>
                    <Select value={form.severity} onValueChange={(value) => updateField('severity', value)}>
                      <SelectTrigger id="severity"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Leve</SelectItem>
                        <SelectItem value="moderate">Moderada</SelectItem>
                        <SelectItem value="severe">Severa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="painLevel">Dor (0-10)</Label>
                    <Input
                      id="painLevel"
                      type="number"
                      min="0"
                      max="10"
                      required
                      value={form.painLevel}
                      onChange={(event) => updateField('painLevel', event.target.value)}
                      placeholder="Ex.: 6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lifestyle">Estilo de vida</Label>
                  <Select value={form.lifestyle} onValueChange={(value) => updateField('lifestyle', value)}>
                    <SelectTrigger id="lifestyle"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentário</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="very_active">Muito ativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    {isComplete
                      ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                      : <AlertCircle className="h-5 w-5 text-amber-600" />}
                    <span className="font-medium">{isComplete ? 'Perfil completo' : 'Perfil incompleto'}</span>
                    <Badge variant={isComplete ? 'default' : 'secondary'}>{completedFields}/5</Badge>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button type="button" variant="outline" disabled={!isComplete} onClick={handleGenerateRecommendation}>
                      <Activity className="mr-2 h-4 w-4" />
                      Gerar recomendação IA
                    </Button>
                    <Button type="submit" disabled={!isComplete || isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Salvando...' : 'Salvar perfil'}
                    </Button>
                  </div>
                </div>

                {recommendation && (
                  <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">Recomendação de IA</h3>
                      <Badge variant="secondary">{recommendation.confidence}% de confiança</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md bg-background p-3">
                        <span className="text-muted-foreground">Frequência</span>
                        <p className="font-medium">{recommendation.frequency}x por semana</p>
                      </div>
                      <div className="rounded-md bg-background p-3">
                        <span className="text-muted-foreground">Duração</span>
                        <p className="font-medium">{recommendation.duration} semanas</p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="mb-1 font-medium">Exercícios sugeridos</p>
                      <p className="text-muted-foreground">
                        {recommendation.exercises.map((item) => item.replace(/_/g, ' ')).join(', ')}
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{recommendation.reasoning}</p>
                  </div>
                )}

                {saveError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro ao salvar</AlertTitle>
                    <AlertDescription>{saveError}</AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Histórico de utilização
              </CardTitle>
              <CardDescription>Registros mais recentes primeiro.</CardDescription>
            </CardHeader>
            <CardContent>
              {profileQuery.data.history.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum histórico registrado para este paciente.
                </div>
              ) : (
                <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                  {profileQuery.data.history.map((entry, index) => (
                    <article key={entry.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{formatDateTime(entry.created_at)}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.responsible_user_name || 'Usuário não disponível'}
                          </p>
                        </div>
                        {index === 0 && <Badge>Mais recente</Badge>}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                        <div><dt className="text-muted-foreground">Idade</dt><dd className="font-medium">{entry.age} anos</dd></div>
                        <div><dt className="text-muted-foreground">Condição</dt><dd className="font-medium">{conditionLabels[entry.condition]}</dd></div>
                        <div><dt className="text-muted-foreground">Severidade</dt><dd className="font-medium">{severityLabels[entry.severity]}</dd></div>
                        <div><dt className="text-muted-foreground">Dor</dt><dd className="font-medium">{entry.pain_level}/10</dd></div>
                        <div className="col-span-2 sm:col-span-2"><dt className="text-muted-foreground">Estilo de vida</dt><dd className="font-medium">{lifestyleLabels[entry.lifestyle]}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cadastrar novo paciente</DialogTitle>
            <DialogDescription>
              Cadastre a identificação do paciente para continuar no Perfil do Paciente. Os campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <PatientForm onSuccess={handlePatientCreated} onCancel={() => setIsPatientFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PatientProfilePage() {
  return <AppPageShell><PatientProfilePageContent /></AppPageShell>
}
