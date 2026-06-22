'use client'

import { FormEvent, useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { Bell, Building2, Settings as SettingsIcon, Shield, User } from 'lucide-react'

type ProfileForm = {
  full_name: string
  email: string
  phone: string
  crefito: string
  specialty: string
  university: string
  semester: string
  currentPassword: string
  newPassword: string
  passwordConfirmation: string
}

const emptyForm: ProfileForm = {
  full_name: '', email: '', phone: '', crefito: '', specialty: '', university: '', semester: '',
  currentPassword: '', newPassword: '', passwordConfirmation: '',
}

export default function Settings() {
  const { user, refreshSession } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<ProfileForm>(emptyForm)

  useEffect(() => {
    if (!user || editing) return
    setForm({
      ...emptyForm,
      full_name: user.full_name ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      crefito: user.crefito ?? '',
      specialty: user.specialty ?? '',
      university: user.university ?? '',
      semester: user.semester?.toString() ?? '',
    })
  }, [user, editing])

  const update = (field: keyof ProfileForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const cancel = () => {
    setEditing(false)
    setError('')
    setSuccess('')
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, newPassword: form.newPassword || undefined }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel salvar o perfil.')
      const refreshed = await refreshSession()
      if (refreshed.error) throw refreshed.error
      setEditing(false)
      setSuccess('Perfil atualizado com sucesso.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar o perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
              <SettingsIcon className="h-8 w-8" /> Configuracoes
            </h1>
            <p className="mt-2 text-muted-foreground">Gerencie seus dados pessoais e profissionais.</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Perfil</TabsTrigger>
              <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />Notificacoes</TabsTrigger>
              <TabsTrigger value="privacy"><Shield className="mr-2 h-4 w-4" />Privacidade</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Informacoes do perfil</CardTitle>
                  <CardDescription>Dados da sua conta no FisioHub. Clinica e permissoes sao protegidas.</CardDescription>
                </CardHeader>
                <CardContent>
                  {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                  {success && <Alert className="mb-4 border-emerald-200 bg-emerald-50"><AlertDescription className="text-emerald-800">{success}</AlertDescription></Alert>}

                  <form onSubmit={save} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Nome completo"><Input value={form.full_name} onChange={update('full_name')} disabled={!editing} required /></Field>
                      <Field label="E-mail"><Input type="email" value={form.email} onChange={update('email')} disabled={!editing} required /></Field>
                      <Field label="Telefone"><Input value={form.phone} onChange={update('phone')} disabled={!editing} /></Field>
                      <Field label="CREFITO"><Input value={form.crefito} onChange={update('crefito')} disabled={!editing} /></Field>
                      <Field label="Especialidade"><Input value={form.specialty} onChange={update('specialty')} disabled={!editing} /></Field>
                      <Field label="Universidade"><Input value={form.university} onChange={update('university')} disabled={!editing} /></Field>
                      <Field label="Semestre"><Input type="number" min="1" max="20" value={form.semester} onChange={update('semester')} disabled={!editing} /></Field>
                      <Field label="Perfil de acesso"><Input value={user?.role ?? ''} disabled /></Field>
                    </div>

                    <div className="rounded-md border bg-muted/30 p-4">
                      <div className="mb-1 flex items-center gap-2 font-medium"><Building2 className="h-4 w-4" />Clinica vinculada</div>
                      <p className="text-sm text-muted-foreground">{user?.clinic_name ?? 'Nao informada'}</p>
                    </div>

                    {editing && (
                      <div className="grid gap-4 border-t pt-5 sm:grid-cols-3">
                        <Field label="Senha atual"><Input type="password" autoComplete="current-password" value={form.currentPassword} onChange={update('currentPassword')} /></Field>
                        <Field label="Nova senha"><Input type="password" autoComplete="new-password" value={form.newPassword} onChange={update('newPassword')} minLength={8} /></Field>
                        <Field label="Confirmar nova senha"><Input type="password" autoComplete="new-password" value={form.passwordConfirmation} onChange={update('passwordConfirmation')} /></Field>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {!editing ? (
                        <Button type="button" onClick={() => { setEditing(true); setSuccess('') }}>Editar perfil</Button>
                      ) : (
                        <><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alteracoes'}</Button><Button type="button" variant="outline" onClick={cancel} disabled={saving}>Cancelar</Button></>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications"><Card><CardHeader><CardTitle>Preferencias de notificacao</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">As preferencias atuais permanecem ativas.</p></CardContent></Card></TabsContent>
            <TabsContent value="privacy"><Card><CardHeader><CardTitle>Privacidade</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Seus dados ficam vinculados exclusivamente a sua clinica.</p></CardContent></Card></TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm font-medium"><span>{label}</span>{children}</label>
}
