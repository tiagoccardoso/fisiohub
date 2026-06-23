'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ChevronLeft, ChevronRight, Edit3, Loader2, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import type { PatientListItem, PatientListResponse, PatientRecord } from '@/lib/patient'
import { PatientForm } from '@/components/patients/patient-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Props = {
  selectedPatientId: string
  onSelectPatient: (id: string) => void
  onPatientChanged: (id?: string) => void
  onCreatePatient: () => void
}

type Confirmation = { type: 'status'; patient: PatientListItem } | { type: 'delete'; patient: PatientListItem } | null

async function readJson(response: Response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || 'Não foi possível concluir a operação.')
  return payload
}

export function PatientManagement({ selectedPatientId, onSelectPatient, onPatientChanged, onCreatePatient }: Props) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null)
  const [isLoadingPatient, setIsLoadingPatient] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation>(null)
  const [isOperating, setIsOperating] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => setPage(1), [debouncedSearch])

  const patientsQuery = useQuery<PatientListResponse>({
    queryKey: ['patient-management', debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({ management: 'true', page: String(page), pageSize: '10' })
      if (debouncedSearch) params.set('search', debouncedSearch)
      return readJson(await fetch(`/api/patients?${params}`, { cache: 'no-store' }))
    },
  })

  const refresh = async (patientId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['patient-management'] }),
      queryClient.invalidateQueries({ queryKey: ['patients'] }),
    ])
    onPatientChanged(patientId)
  }

  const openEdit = async (patient: PatientListItem) => {
    setIsLoadingPatient(true)
    try {
      const payload = await readJson(await fetch(`/api/patients/${encodeURIComponent(patient.id)}`, { cache: 'no-store' }))
      const { permissions: _permissions, ...record } = payload
      setEditingPatient(record as PatientRecord)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o cadastro.')
    } finally {
      setIsLoadingPatient(false)
    }
  }

  const confirmOperation = async () => {
    if (!confirmation || isOperating) return
    setIsOperating(true)
    const { patient, type } = confirmation
    try {
      if (type === 'status') {
        const nextStatus = patient.status === 'active' ? 'inactive' : 'active'
        await readJson(await fetch(`/api/patients/${encodeURIComponent(patient.id)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }),
        }))
        toast.success(nextStatus === 'active' ? 'Paciente reativado com sucesso.' : 'Paciente inativado com sucesso.')
        await refresh(patient.id)
      } else {
        await readJson(await fetch(`/api/patients/${encodeURIComponent(patient.id)}`, { method: 'DELETE' }))
        toast.success('Paciente excluído com sucesso.')
        if (selectedPatientId === patient.id) onSelectPatient('')
        await refresh()
      }
      setConfirmation(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a operação.')
    } finally {
      setIsOperating(false)
    }
  }

  const actions = (patient: PatientListItem) => (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => onSelectPatient(patient.id)}>Abrir perfil</Button>
      {patientsQuery.data?.permissions.canEdit && (
        <Button type="button" size="sm" variant="outline" onClick={() => openEdit(patient)} disabled={isLoadingPatient}>
          <Edit3 className="mr-1.5 h-4 w-4" />Editar
        </Button>
      )}
      {patientsQuery.data?.permissions.canChangeStatus && (
        <Button type="button" size="sm" variant="outline" onClick={() => setConfirmation({ type: 'status', patient })}>
          {patient.status === 'active' ? <UserX className="mr-1.5 h-4 w-4" /> : <UserCheck className="mr-1.5 h-4 w-4" />}
          {patient.status === 'active' ? 'Inativar' : 'Reativar'}
        </Button>
      )}
      {patientsQuery.data?.permissions.canDelete && (
        <Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmation({ type: 'delete', patient })}>
          <Trash2 className="mr-1.5 h-4 w-4" />Excluir
        </Button>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Pacientes cadastrados</CardTitle>
            <CardDescription>Localize por nome ou CPF e faça a manutenção do cadastro.</CardDescription>
          </div>
          {patientsQuery.data?.permissions.canCreate && (
            <Button type="button" onClick={onCreatePatient} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Cadastrar paciente</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por nome ou CPF" aria-label="Pesquisar pacientes por nome ou CPF" className="pl-10" />
        </div>

        {patientsQuery.isLoading ? (
          <div className="flex min-h-40 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando pacientes...</div>
        ) : patientsQuery.error ? (
          <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Erro ao carregar pacientes</AlertTitle><AlertDescription>{patientsQuery.error.message}</AlertDescription></Alert>
        ) : patientsQuery.data?.items.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            {debouncedSearch ? 'Nenhum paciente encontrado para a pesquisa.' : 'Nenhum paciente cadastrado.'}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CPF</TableHead><TableHead>Situação</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                <TableBody>{patientsQuery.data?.items.map((patient) => (
                  <TableRow key={patient.id} data-state={selectedPatientId === patient.id ? 'selected' : undefined}>
                    <TableCell className="font-medium">{patient.full_name}</TableCell>
                    <TableCell>{patient.cpf_masked}</TableCell>
                    <TableCell><Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>{patient.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell>{actions(patient)}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            <div className="space-y-3 md:hidden">{patientsQuery.data?.items.map((patient) => (
              <article key={patient.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{patient.full_name}</h3><p className="text-sm text-muted-foreground">CPF {patient.cpf_masked}</p></div><Badge variant={patient.status === 'active' ? 'default' : 'secondary'}>{patient.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></div>
                {actions(patient)}
              </article>
            ))}</div>
          </>
        )}

        {patientsQuery.data && patientsQuery.data.total > 0 && (
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{patientsQuery.data.total} paciente(s) | Página {patientsQuery.data.page} de {patientsQuery.data.totalPages}</p>
            <div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={page <= 1 || patientsQuery.isFetching} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><Button type="button" size="sm" variant="outline" disabled={page >= patientsQuery.data.totalPages || patientsQuery.isFetching} onClick={() => setPage((value) => value + 1)}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
          </div>
        )}
      </CardContent>

      <Dialog open={Boolean(editingPatient)} onOpenChange={(open) => !open && setEditingPatient(null)}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Editar paciente</DialogTitle><DialogDescription>Atualize o cadastro. Nome, CPF e data de nascimento permanecem obrigatórios.</DialogDescription></DialogHeader>
          {editingPatient && <PatientForm patient={editingPatient} onCancel={() => setEditingPatient(null)} onSuccess={async (patient) => { setEditingPatient(null); await refresh(patient.id) }} />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmation)} onOpenChange={(open) => !open && !isOperating && setConfirmation(null)}>
        <DialogContent><DialogHeader><DialogTitle>{confirmation?.type === 'delete' ? 'Excluir paciente?' : confirmation?.patient.status === 'active' ? 'Inativar paciente?' : 'Reativar paciente?'}</DialogTitle><DialogDescription>
          {confirmation?.type === 'delete' ? 'A exclusão é definitiva e só será concluída se não houver prontuários, consultas, avaliações, documentos ou outros vínculos. Pacientes com histórico devem ser inativados.' : confirmation?.patient.status === 'active' ? 'O cadastro permanecerá disponível no histórico e poderá ser reativado.' : 'O paciente voltará a aparecer como ativo nos fluxos do sistema.'}
        </DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" disabled={isOperating} onClick={() => setConfirmation(null)}>Cancelar</Button><Button type="button" variant={confirmation?.type === 'delete' ? 'destructive' : 'default'} disabled={isOperating} onClick={confirmOperation}>{isOperating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{confirmation?.type === 'delete' ? 'Confirmar exclusão' : 'Confirmar'}</Button></DialogFooter>
      </Dialog>
    </Card>
  )
}
