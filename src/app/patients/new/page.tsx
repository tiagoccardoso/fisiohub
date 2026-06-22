'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createPatient } from '@/lib/api';
import { ArrowLeft, Contact, Save, UserPlus } from 'lucide-react';
import { AppPageShell } from '@/components/layouts/app-page-shell';

const patientFormSchema = z.object({
  full_name: z.string().min(3, 'O nome completo é obrigatório.'),
  birth_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de nascimento inválida.',
  }),
  cpf: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;

function NewPatientPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
  });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Paciente criado com sucesso.');
      router.push('/patients');
    },
    onError: (error) => {
      toast.error('Não foi possível criar o paciente. ' + error.message);
    },
  });

  const onSubmit = (data: PatientFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="min-h-dvh bg-background px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1>Novo Paciente</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados para cadastrar um novo paciente.</p>
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Identificação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input id="full_name" placeholder="Ex: Maria Oliveira Silva" aria-invalid={!!errors.full_name} {...register('full_name')} />
                {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento *</Label>
                <Input id="birth_date" type="date" aria-invalid={!!errors.birth_date} {...register('birth_date')} />
                {errors.birth_date && <p className="text-sm text-destructive">{errors.birth_date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF (Opcional)</Label>
                <Input id="cpf" placeholder="000.000.000-00" aria-invalid={!!errors.cpf} {...register('cpf')} />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Contact className="h-5 w-5" />Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (Opcional)</Label>
                <Input id="phone" type="tel" placeholder="(00) 00000-0000" aria-invalid={!!errors.phone} {...register('phone')} />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail (Opcional)</Label>
                <Input id="email" type="email" placeholder="email@exemplo.com" aria-invalid={!!errors.email} {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {mutation.isPending ? 'Salvando...' : 'Salvar Paciente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewPatientPage() {
  return <AppPageShell><NewPatientPageContent /></AppPageShell>;
}
