'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { AuthGuard } from '@/components/auth/auth-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth-fixed'
import { fetchJson } from '@/lib/api-client'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, Save, Clock, MapPin, Info } from 'lucide-react'

interface EventFormData {
  title: string
  description: string
  start_time: string
  end_time: string
  type: string
  location: string
  attendees: string[]
}

const EVENT_TYPES = [
  { value: 'appointment', label: 'Consulta' },
  { value: 'session', label: 'Sessão de Fisioterapia' },
  { value: 'evaluation', label: 'Avaliação' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'return', label: 'Retorno' },
  { value: 'supervision', label: 'Supervisão' },
  { value: 'break', label: 'Pausa' }
]

export default function NewEvent() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    type: 'appointment',
    location: '',
    attendees: []
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('Você precisa estar logado para criar um evento')
      return
    }

    if (!formData.title.trim()) {
      toast.error('O título é obrigatório')
      return
    }

    if (!formData.start_time || !formData.end_time) {
      toast.error('Data e horário de início e fim são obrigatórios')
      return
    }

    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
      toast.error('A data/hora de fim deve ser posterior ao início')
      return
    }

    setIsLoading(true)

    try {
      await fetchJson('/api/calendar-events', { method: 'POST', body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
          event_type: formData.type,
          status: 'scheduled',
          location: formData.location,
          attendees: formData.attendees.length > 0 ? formData.attendees : [user.id],
        }) })

      toast.success('Evento criado com sucesso!')
      router.push('/calendar')
    } catch (error: any) {
      console.error('Erro ao criar evento:', error)
      toast.error('Erro ao criar evento: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const setDefaultTimes = () => {
    const now = new Date()
    const start = new Date(now)
    start.setMinutes(0, 0, 0) // Arredondar para a hora cheia

    const end = new Date(start)
    end.setHours(end.getHours() + 1) // 1 hora de duração padrão

    setFormData(prev => ({
      ...prev,
      start_time: formatDateTimeLocal(start),
      end_time: formatDateTimeLocal(end)
    }))
  }

  // Configurar horários padrão na primeira carga
  useEffect(() => {
    if (!formData.start_time && !formData.end_time) {
      setDefaultTimes()
    }
  }, [])

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-primary" />
              <h1>Criar Novo Evento</h1>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Informações do Evento</CardTitle>
              <CardDescription>
                Agende consultas, sessões de fisioterapia, reuniões e outros eventos importantes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Evento *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Consulta de Fisioterapia - Maria Silva"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    disabled={isLoading}
                    required
                  />
                </div>

                {/* Tipo de Evento */}
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Evento</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data e Horário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Data e Hora de Início *
                    </Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Data e Hora de Fim *
                    </Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      disabled={isLoading}
                      min={formData.start_time}
                      required
                    />
                  </div>
                </div>

                {/* Local */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Local
                  </Label>
                  <Input
                    id="location"
                    placeholder="Ex: Sala 1, Consultório A, Online..."
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição/Observações</Label>
                  <Textarea
                    id="description"
                    placeholder="Informações adicionais sobre o evento, procedimentos, materiais necessários, etc."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={isLoading}
                    rows={3}
                  />
                </div>

                {/* Duração Calculada */}
                {formData.start_time && formData.end_time && (
                  <div className="rounded-xl bg-surface-container-low p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Duração: {
                          Math.round(
                            (new Date(formData.end_time).getTime() - new Date(formData.start_time).getTime())
                            / (1000 * 60)
                          )
                        } minutos
                      </span>
                    </div>
                  </div>
                )}

                {/* Informações de Agendamento */}
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-primary">
                    <Info className="h-5 w-5" /> Lembrete
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• O evento será visível no seu calendário pessoal</li>
                    <li>• Você pode editar ou cancelar o evento a qualquer momento</li>
                    <li>• Notificações serão enviadas próximo ao horário do evento</li>
                    <li>• Colaboradores podem ser adicionados após a criação</li>
                  </ul>
                </div>

                {/* Botões */}
                <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center">
                  <Button
                    type="submit"
                    disabled={isLoading || !formData.title.trim() || !formData.start_time || !formData.end_time}
                    className="flex items-center gap-2 sm:order-3 sm:ml-auto"
                  >
                    <Save className="h-4 w-4" />
                    {isLoading ? 'Criando...' : 'Criar Evento'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={setDefaultTimes}
                    disabled={isLoading}
                    className="sm:order-2"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Agora
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
