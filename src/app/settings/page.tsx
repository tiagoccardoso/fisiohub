'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Bell, Building2, Settings as SettingsIcon, Shield, User } from 'lucide-react'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/use-auth'
import { fetchJson } from '@/lib/api-client'

type ProfileForm = { full_name: string; email: string; phone: string; crefito: string; specialty: string; university: string; semester: string; avatar_url: string; currentPassword: string; newPassword: string; passwordConfirmation: string }
type ClinicForm = { name: string; legal_name: string; document_number: string; phone: string; email: string; address: string; address_line: string; address_number: string; address_complement: string; neighborhood: string; city: string; state: string; postal_code: string; responsible_name: string; logo_url: string }
const emptyProfile: ProfileForm = { full_name: '', email: '', phone: '', crefito: '', specialty: '', university: '', semester: '', avatar_url: '', currentPassword: '', newPassword: '', passwordConfirmation: '' }
const emptyClinic: ClinicForm = { name: '', legal_name: '', document_number: '', phone: '', email: '', address: '', address_line: '', address_number: '', address_complement: '', neighborhood: '', city: '', state: '', postal_code: '', responsible_name: '', logo_url: '' }

export default function Settings() {
  const { user, refreshSession } = useAuth()
  const [editing, setEditing] = useState(false)
  const [editingClinic, setEditingClinic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<ProfileForm>(emptyProfile)
  const [clinic, setClinic] = useState<ClinicForm>(emptyClinic)
  const [preferences, setPreferences] = useState({ email_notifications: true, calendar_reminders: true, project_updates: true })

  useEffect(() => {
    if (!user || editing) return
    setForm({ ...emptyProfile, full_name: user.full_name ?? '', email: user.email ?? '', phone: user.phone ?? '', crefito: user.crefito ?? '', specialty: user.specialty ?? '', university: user.university ?? '', semester: user.semester?.toString() ?? '', avatar_url: user.avatar_url ?? '' })
    setPreferences({ email_notifications: user.preferences?.email_notifications !== false, calendar_reminders: user.preferences?.calendar_reminders !== false, project_updates: user.preferences?.project_updates !== false })
  }, [user, editing])

  useEffect(() => { fetchJson<Record<string, unknown>>('/api/clinic').then((data) => setClinic(Object.fromEntries(Object.keys(emptyClinic).map((key) => [key, String(data?.[key] ?? '')])) as ClinicForm)).catch((e) => setError(e.message)) }, [])
  const update = (field: keyof ProfileForm) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const updateClinic = (field: keyof ClinicForm) => (event: React.ChangeEvent<HTMLInputElement>) => setClinic((current) => ({ ...current, [field]: event.target.value }))
  const notify = (message: string) => { setError(''); setSuccess(message) }

  const saveProfile = async (event?: FormEvent) => {
    event?.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      await fetchJson('/api/profile', { method: 'PATCH', body: JSON.stringify({ ...form, newPassword: form.newPassword || undefined, preferences }) })
      const refreshed = await refreshSession(); if (refreshed.error) throw refreshed.error
      setEditing(false); notify('Perfil atualizado com sucesso.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar o perfil.') } finally { setSaving(false) }
  }
  const saveClinic = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try { const data = await fetchJson<ClinicForm>('/api/clinic', { method: 'PATCH', body: JSON.stringify(clinic) }); setClinic(data); setEditingClinic(false); await refreshSession(); notify('Dados da clínica atualizados.') }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar a clínica.') } finally { setSaving(false) }
  }

  return <AuthGuard><DashboardLayout><div className="space-y-6">
    <div><h1 className="flex items-center gap-2 text-3xl font-bold"><SettingsIcon className="h-8 w-8" />Configurações</h1><p className="mt-2 text-muted-foreground">Gerencie seu perfil, a clínica e suas preferências.</p></div>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}{success && <Alert className="border-emerald-200 bg-emerald-50"><AlertDescription className="text-emerald-800">{success}</AlertDescription></Alert>}
    <Tabs defaultValue="profile" className="space-y-6"><TabsList className="grid w-full grid-cols-2 sm:grid-cols-4"><TabsTrigger value="profile"><User className="mr-2 h-4 w-4" />Perfil</TabsTrigger><TabsTrigger value="clinic"><Building2 className="mr-2 h-4 w-4" />Clínica</TabsTrigger><TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />Notificações</TabsTrigger><TabsTrigger value="privacy"><Shield className="mr-2 h-4 w-4" />Privacidade</TabsTrigger></TabsList>
      <TabsContent value="profile"><Card><CardHeader><CardTitle>Informações do perfil</CardTitle><CardDescription>E-mail e senha exigem a confirmação da senha atual.</CardDescription></CardHeader><CardContent><form onSubmit={saveProfile} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome completo"><Input value={form.full_name} onChange={update('full_name')} disabled={!editing} required /></Field><Field label="E-mail"><Input type="email" value={form.email} onChange={update('email')} disabled={!editing} required /></Field><Field label="Telefone"><Input value={form.phone} onChange={update('phone')} disabled={!editing} /></Field><Field label="Foto (URL)"><Input type="url" value={form.avatar_url} onChange={update('avatar_url')} disabled={!editing} /></Field><Field label="CREFITO"><Input value={form.crefito} onChange={update('crefito')} disabled={!editing} /></Field><Field label="Especialidade"><Input value={form.specialty} onChange={update('specialty')} disabled={!editing} /></Field><Field label="Universidade"><Input value={form.university} onChange={update('university')} disabled={!editing} /></Field><Field label="Semestre"><Input type="number" min="1" max="20" value={form.semester} onChange={update('semester')} disabled={!editing} /></Field></div>
        {editing && <div className="grid gap-4 border-t pt-5 sm:grid-cols-3"><Field label="Senha atual"><Input type="password" value={form.currentPassword} onChange={update('currentPassword')} /></Field><Field label="Nova senha"><Input type="password" minLength={8} value={form.newPassword} onChange={update('newPassword')} /></Field><Field label="Confirmar senha"><Input type="password" value={form.passwordConfirmation} onChange={update('passwordConfirmation')} /></Field></div>}
        <div className="flex gap-3">{editing ? <><Button type="submit" disabled={saving}>Salvar alterações</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button></> : <Button type="button" onClick={() => setEditing(true)}>Editar perfil</Button>}</div></form></CardContent></Card></TabsContent>
      <TabsContent value="clinic"><Card><CardHeader><CardTitle>Dados da clínica</CardTitle><CardDescription>Somente administradores podem alterar estas informações.</CardDescription></CardHeader><CardContent><form onSubmit={saveClinic} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome da clínica"><Input required value={clinic.name} onChange={updateClinic('name')} disabled={!editingClinic} /></Field><Field label="Razão social"><Input value={clinic.legal_name} onChange={updateClinic('legal_name')} disabled={!editingClinic} /></Field><Field label="Documento fiscal"><Input value={clinic.document_number} onChange={updateClinic('document_number')} disabled={!editingClinic} /></Field><Field label="Responsável"><Input value={clinic.responsible_name} onChange={updateClinic('responsible_name')} disabled={!editingClinic} /></Field><Field label="Telefone"><Input required value={clinic.phone} onChange={updateClinic('phone')} disabled={!editingClinic} /></Field><Field label="E-mail"><Input required type="email" value={clinic.email} onChange={updateClinic('email')} disabled={!editingClinic} /></Field><Field label="Logomarca (URL)"><Input type="url" value={clinic.logo_url} onChange={updateClinic('logo_url')} disabled={!editingClinic} /></Field><Field label="CEP"><Input value={clinic.postal_code} onChange={updateClinic('postal_code')} disabled={!editingClinic} /></Field><Field label="Logradouro"><Input value={clinic.address_line} onChange={updateClinic('address_line')} disabled={!editingClinic} /></Field><Field label="Número"><Input value={clinic.address_number} onChange={updateClinic('address_number')} disabled={!editingClinic} /></Field><Field label="Complemento"><Input value={clinic.address_complement} onChange={updateClinic('address_complement')} disabled={!editingClinic} /></Field><Field label="Bairro"><Input value={clinic.neighborhood} onChange={updateClinic('neighborhood')} disabled={!editingClinic} /></Field><Field label="Cidade"><Input value={clinic.city} onChange={updateClinic('city')} disabled={!editingClinic} /></Field><Field label="UF"><Input maxLength={2} value={clinic.state} onChange={updateClinic('state')} disabled={!editingClinic} /></Field><Field label="Endereço completo"><Input required value={clinic.address} onChange={updateClinic('address')} disabled={!editingClinic} /></Field></div><div className="flex gap-3">{editingClinic ? <><Button type="submit" disabled={saving}>Salvar clínica</Button><Button type="button" variant="outline" onClick={() => setEditingClinic(false)}>Cancelar</Button></> : <Button type="button" disabled={user?.role !== 'admin'} onClick={() => setEditingClinic(true)}>Editar clínica</Button>}</div></form></CardContent></Card></TabsContent>
      <TabsContent value="notifications"><Card><CardHeader><CardTitle>Preferências</CardTitle></CardHeader><CardContent className="space-y-4">{Object.entries({ email_notifications: 'Notificações por e-mail', calendar_reminders: 'Lembretes do calendário', project_updates: 'Atualizações de projetos' }).map(([key, label]) => <div key={key} className="flex items-center justify-between rounded-md border p-4"><span>{label}</span><Switch checked={preferences[key as keyof typeof preferences]} onCheckedChange={(value) => setPreferences({ ...preferences, [key]: value })} /></div>)}<Button disabled={saving} onClick={() => saveProfile()}>Salvar preferências</Button></CardContent></Card></TabsContent>
      <TabsContent value="privacy"><Card><CardHeader><CardTitle>Privacidade</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Os dados desta conta e dos módulos ficam vinculados à clínica autenticada.</p></CardContent></Card></TabsContent>
    </Tabs>
  </div></DashboardLayout></AuthGuard>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2 text-sm font-medium"><span>{label}</span>{children}</label> }
