'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Calendar, Phone, Mail, Edit } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PatientRecordsTab } from '@/components/patients/PatientRecordsTab'
import { ExercisePlanTab } from '@/components/patients/ExercisePlanTab'
import { PatientProgressTab } from '@/components/patients/PatientProgressTab'
import { PatientDocumentsTab } from '@/components/patients/PatientDocumentsTab'
import { PatientAIInsights } from '@/components/patients/PatientAIInsights'
import { Skeleton } from '@/components/ui/skeleton'
import { AppPageShell } from '@/components/layouts/app-page-shell'
import { Patient } from '@/types/database.types'

function PatientDetailPageContent({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState('records')

  const { data: patient, isLoading, error } = useQuery<Patient>({
    queryKey: ['patient', id],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${encodeURIComponent(id)}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Falha ao carregar o perfil do paciente.')
      }

      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Paciente não encontrado ou erro ao carregar dados.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const age = patient.birth_date
    ? new Date().getFullYear() - new Date(patient.birth_date).getFullYear()
    : null

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <Link href="/patients">
            <Button variant="outline" size="sm" className="shrink-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold tracking-tight">{patient.full_name}</h1>
            <p className="text-muted-foreground">
              {patient.created_at
                ? `Paciente desde ${format(new Date(patient.created_at), 'dd/MM/yyyy', { locale: ptBR })}`
                : 'Data de cadastro não informada'}
            </p>
          </div>
        </div>
        <Button className="w-full sm:w-auto">
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                E-mail
              </div>
              <p className="font-medium">{patient.email || 'Não informado'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                Telefone
              </div>
              <p className="font-medium">{patient.phone || 'Não informado'}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Data de Nascimento
              </div>
              <p className="font-medium">
                {patient.birth_date
                  ? format(new Date(patient.birth_date), 'dd/MM/yyyy', { locale: ptBR })
                  : 'Não informado'
                }
              </p>
            </div>

            {age && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Idade
                </div>
                <Badge variant="secondary" className="w-fit">
                  {age} anos
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 flex-1">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="records">Prontuários</TabsTrigger>
            <TabsTrigger value="exercises">Plano de Exercícios</TabsTrigger>
            <TabsTrigger value="progress">Evolução</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="ai-insights">Insights de IA</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="records" className="mt-6">
          <PatientRecordsTab patientId={id} />
        </TabsContent>

        <TabsContent value="exercises" className="mt-6">
          <ExercisePlanTab patientId={id} />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <PatientProgressTab patientId={id} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <PatientDocumentsTab patientId={id} />
        </TabsContent>

        <TabsContent value="ai-insights" className="mt-6">
          <PatientAIInsights patientId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function PatientDetailPage(props: { params: Promise<{ id: string }> }) {
  return <AppPageShell><PatientDetailPageContent {...props} /></AppPageShell>
}
