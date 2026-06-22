'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { AppPageShell } from '@/components/layouts/app-page-shell'
import { PatientForm } from '@/components/patients/patient-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function NewPatientPageContent() {
  const router = useRouter()

  return (
    <div className="min-h-dvh bg-background px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Paciente</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados para cadastrar um novo paciente.</p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Cadastro do paciente</CardTitle>
            <CardDescription>Os campos marcados com * são obrigatórios.</CardDescription>
          </CardHeader>
          <CardContent>
            <PatientForm onCancel={() => router.back()} onSuccess={() => router.push('/patients')} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function NewPatientPage() {
  return <AppPageShell><NewPatientPageContent /></AppPageShell>
}
