'use client'

import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Contact, Loader2, Save, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { createPatient } from '@/lib/api'
import {
  CreatedPatient,
  formatCpf,
  patientFormSchema,
  PatientFormValues,
} from '@/lib/patient'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type PatientFormProps = {
  onSuccess: (patient: CreatedPatient) => void
  onCancel?: () => void
}

const inputClassName = 'w-full'

export function PatientForm({ onSuccess, onCancel }: PatientFormProps) {
  const queryClient = useQueryClient()
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      full_name: '',
      cpf: '',
      birth_date: '',
      gender: undefined,
      phone: '',
      email: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      initial_medical_history: '',
      notes: '',
    },
  })

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: async (patient: CreatedPatient) => {
      await queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Paciente cadastrado com sucesso.')
      onSuccess(patient)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Não foi possível cadastrar o paciente.')
    },
  })

  const fieldError = (field: keyof PatientFormValues) => errors[field]?.message

  return (
    <form
      onSubmit={handleSubmit((values) => {
        if (!mutation.isPending) mutation.mutate(values)
      })}
      className="space-y-6"
      noValidate
    >
      <section className="space-y-4" aria-labelledby="patient-identification-title">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" />
          <h2 id="patient-identification-title" className="font-semibold">Identificação</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="full_name">Nome completo *</Label>
            <Input id="full_name" autoComplete="name" aria-invalid={Boolean(errors.full_name)} {...register('full_name')} />
            {fieldError('full_name') && <p className="text-sm text-destructive">{fieldError('full_name')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Controller
              control={control}
              name="cpf"
              render={({ field }) => (
                <Input
                  {...field}
                  id="cpf"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  aria-invalid={Boolean(errors.cpf)}
                  onChange={(event) => field.onChange(formatCpf(event.target.value))}
                />
              )}
            />
            {fieldError('cpf') && <p className="text-sm text-destructive">{fieldError('cpf')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Data de nascimento *</Label>
            <Input id="birth_date" type="date" max={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(errors.birth_date)} {...register('birth_date')} />
            {fieldError('birth_date') && <p className="text-sm text-destructive">{fieldError('birth_date')}</p>}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="gender">Sexo ou gênero</Label>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger id="gender"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Feminino</SelectItem>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                    <SelectItem value="not_informed">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t pt-5" aria-labelledby="patient-contact-title">
        <div className="flex items-center gap-2">
          <Contact className="h-5 w-5 text-primary" />
          <h2 id="patient-contact-title" className="font-semibold">Contato e informações complementares</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" type="tel" autoComplete="tel" placeholder="(00) 00000-0000" className={inputClassName} {...register('phone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} className={inputClassName} {...register('email')} />
            {fieldError('email') && <p className="text-sm text-destructive">{fieldError('email')}</p>}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" autoComplete="street-address" {...register('address')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Contato de emergência</Label>
            <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Telefone de emergência</Label>
            <Input id="emergency_contact_phone" type="tel" {...register('emergency_contact_phone')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="initial_medical_history">Histórico clínico inicial</Label>
            <Textarea id="initial_medical_history" rows={3} {...register('initial_medical_history')} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>
        </div>
      </section>

      {mutation.isError && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível salvar</AlertTitle>
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancelar</Button>}
        <Button type="submit" disabled={mutation.isPending} className="gap-2">
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mutation.isPending ? 'Salvando...' : 'Salvar paciente'}
        </Button>
      </div>
    </form>
  )
}
