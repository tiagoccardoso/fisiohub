'use client'

import { FormEvent, useState } from 'react'
import { AuthGuard } from '@/components/auth/auth-guard'
import { DashboardLayout } from '@/components/layouts/dashboard-layout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Bot, ExternalLink, HelpCircle, RotateCcw, Send } from 'lucide-react'

type Message = { role: 'user' | 'assistant'; content: string }

const resources: Array<[string, string]> = [
  ['Pacientes e prontuarios', 'Cadastre pacientes, consulte perfis, evolucoes e avaliacoes.'],
  ['Agenda e equipe', 'Organize compromissos e profissionais vinculados a sua clinica.'],
  ['Tarefas e projetos', 'Acompanhe atividades, responsaveis, prioridades e prazos.'],
  ['Exercicios e analises', 'Consulte a biblioteca de exercicios e indicadores da clinica.'],
]

export default function SupportPage() {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')

  const ask = async (message: string, appendQuestion: boolean) => {
    if (!message || loading) return
    setError('')
    if (appendQuestion) setMessages((current) => [...current, { role: 'user', content: message }])
    setLoading(true)
    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error ?? 'Nao foi possivel obter uma resposta.')
      setMessages((current) => [...current, { role: 'assistant', content: payload.response }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'O chat esta indisponivel.')
    } finally {
      setLoading(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const message = question.trim()
    if (!message || loading) return
    setQuestion('')
    setLastQuestion(message)
    await ask(message, true)
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold"><HelpCircle className="h-8 w-8 text-primary" />Central de suporte</h1>
            <p className="mt-2 text-muted-foreground">Ajuda para utilizar os recursos do FisioHub.</p>
          </div>

          <Alert className="border-primary/30 bg-primary/5">
            <AlertTitle>Atendimento humanizado</AlertTitle>
            <AlertDescription className="mt-1 flex flex-wrap items-center gap-2">
              Para atendimento humanizado, abra um ticket pela plataforma SelectSaaS.
              <a href="https://www.selectsaas.com.br" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline">
                Abrir SelectSaaS <ExternalLink className="h-4 w-4" />
              </a>
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {resources.map(([title, description]) => (
              <Card key={title}><CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />Chat de ajuda</CardTitle>
              <CardDescription>Tire duvidas sobre o uso do sistema. Nao envie dados de pacientes ou informacoes clinicas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="min-h-52 max-h-[420px] space-y-3 overflow-y-auto rounded-md border bg-muted/20 p-4" aria-live="polite">
                {messages.length === 0 && <p className="text-sm text-muted-foreground">Digite uma duvida sobre como usar o FisioHub.</p>}
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-auto max-w-[85%] rounded-md bg-primary p-3 text-sm text-primary-foreground' : 'max-w-[90%] whitespace-pre-wrap rounded-md bg-white p-3 text-sm shadow-sm'}>
                    {message.content}
                  </div>
                ))}
                {loading && <p className="text-sm text-muted-foreground">Preparando resposta...</p>}
              </div>
              {error && <Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-3">{error}<Button type="button" variant="outline" size="sm" onClick={() => void ask(lastQuestion, false)} disabled={!lastQuestion || loading}><RotateCcw className="mr-2 h-4 w-4" />Tentar novamente</Button></AlertDescription></Alert>}
              <form onSubmit={submit} className="flex gap-2">
                <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Como cadastro um paciente?" maxLength={1200} disabled={loading} aria-label="Pergunta para o suporte" />
                <Button type="submit" disabled={loading || !question.trim()} aria-label="Enviar pergunta"><Send className="h-4 w-4" /></Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
