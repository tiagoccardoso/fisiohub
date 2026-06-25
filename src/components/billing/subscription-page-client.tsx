'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, CreditCard, Crown, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type BillingPlan = 'trial' | 'monthly' | 'yearly'

type Subscription = {
  plan: 'trial' | 'monthly' | 'yearly' | 'unknown'
  status: string
  trial_end: string | null
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

type SubscriptionResponse = {
  subscription: Subscription | null
  hasAccess: boolean
  error?: string
}

type Action = BillingPlan | 'portal' | 'migrate'

const planCards = [
  {
    id: 'trial' as const,
    title: 'Teste grátis por 7 dias',
    price: 'R$ 0,00',
    cadence: 'por 7 dias',
    description: 'Experimente todos os recursos da plataforma gratuitamente por 7 dias. Durante o período de teste, você terá acesso completo ao sistema, sem limitações de funcionalidades.',
    cta: 'Iniciar teste grátis',
    badge: 'Acesso completo',
    icon: Sparkles,
  },
  {
    id: 'monthly' as const,
    title: 'Plano Mensal',
    price: 'R$ 79,90',
    cadence: 'por mês',
    description: 'Ideal para quem deseja começar com flexibilidade. Com o plano mensal, você tem acesso a todos os recursos da plataforma e pode utilizar o sistema completo para gerenciar sua clínica com mais praticidade.',
    cta: 'Contratar mensal',
    badge: 'Flexível',
    icon: CreditCard,
  },
  {
    id: 'yearly' as const,
    title: 'Plano Anual',
    price: 'R$ 59,90',
    cadence: 'por mês',
    description: 'A melhor opção para quem deseja economizar. No plano anual, você mantém acesso completo a todos os recursos da plataforma pagando um valor mensal reduzido.',
    cta: 'Contratar anual',
    badge: 'Economize R$ 240,00/ano',
    icon: Crown,
    highlighted: true,
  },
]

const validStatuses = new Set(['active', 'trialing'])

function formatDate(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value))
}

export function SubscriptionPageClient() {
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [loadingAction, setLoadingAction] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkoutStatus = searchParams?.get('checkout') ?? null
  const blockReason = searchParams?.get('reason') ?? null

  useEffect(() => {
    let isMounted = true
    async function loadSubscription() {
      setIsLoadingStatus(true)
      setError(null)
      try {
        const response = await fetch('/api/billing/subscription', { cache: 'no-store' })
        const payload = await response.json().catch(() => ({})) as SubscriptionResponse
        if (!response.ok) {
          throw new Error(payload.error || 'Não foi possível carregar a assinatura.')
        }
        if (isMounted) {
          setSubscription(payload.subscription)
          setHasAccess(payload.hasAccess)
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar a assinatura.')
        }
      } finally {
        if (isMounted) setIsLoadingStatus(false)
      }
    }

    loadSubscription()
    return () => {
      isMounted = false
    }
  }, [checkoutStatus])

  const statusMessage = useMemo(() => {
    if (isLoadingStatus) return 'Validando assinatura...'
    if (!subscription) return 'Nenhum plano ativo encontrado. Inicie o teste grátis ou contrate um plano para liberar o sistema.'
    if (subscription.status === 'trialing') {
      return `Teste grátis ativo${formatDate(subscription.trial_end) ? ` até ${formatDate(subscription.trial_end)}` : ''}.`
    }
    if (subscription.status === 'active') {
      return `Assinatura ativa${formatDate(subscription.current_period_end) ? ` até ${formatDate(subscription.current_period_end)}` : ''}.`
    }
    return `Status atual: ${subscription.status}. Regularize a assinatura para liberar o sistema.`
  }, [isLoadingStatus, subscription])

  const startCheckout = async (plan: BillingPlan) => {
    setError(null)
    setLoadingAction(plan)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const payload = await response.json().catch(() => ({})) as { url?: string; error?: string }
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Não foi possível iniciar o checkout.')
      }
      window.location.href = payload.url
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Não foi possível iniciar o checkout.')
      setLoadingAction(null)
    }
  }

  const openPortal = async () => {
    setError(null)
    setLoadingAction('portal')
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const payload = await response.json().catch(() => ({})) as { url?: string; error?: string }
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Não foi possível abrir o portal de cobrança.')
      }
      window.location.href = payload.url
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : 'Não foi possível abrir o portal de cobrança.')
      setLoadingAction(null)
    }
  }

  const migrateToYearly = async () => {
    setError(null)
    setLoadingAction('migrate')
    try {
      const response = await fetch('/api/stripe/subscription/migrate', { method: 'POST' })
      const payload = await response.json().catch(() => ({})) as { subscription?: Subscription; error?: string }
      if (!response.ok || !payload.subscription) {
        throw new Error(payload.error || 'Não foi possível migrar para o plano anual.')
      }
      setSubscription(payload.subscription)
      setHasAccess(validStatuses.has(payload.subscription.status))
    } catch (migrationError) {
      setError(migrationError instanceof Error ? migrationError.message : 'Não foi possível migrar para o plano anual.')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/10 via-white to-emerald-50 p-6 shadow-clinical-lg sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <Badge variant="medical" className="w-fit">Assinatura FisioHub</Badge>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">Escolha o melhor plano para sua clínica</h1>
              <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                Tenha acesso completo ao sistema e utilize todos os recursos disponíveis para organizar sua rotina, gerenciar pacientes, acompanhar atendimentos, controlar informações da clínica e aproveitar as funcionalidades inteligentes da plataforma.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-700">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><ShieldCheck className="h-4 w-4 text-primary" /> Todos os recursos inclusos</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><CheckCircle2 className="h-4 w-4 text-primary" /> Sem limitações por plano</span>
            </div>
          </div>
          <Card className="w-full border-primary/20 bg-white/90 lg:max-w-sm">
            <CardHeader>
              <CardTitle>Status da assinatura</CardTitle>
              <CardDescription>{statusMessage}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant={hasAccess ? 'success' : 'warning'}>{hasAccess ? 'Acesso liberado' : 'Ação necessária'}</Badge>
              {hasAccess && <Button asChild className="w-full"><Link href="/">Acessar sistema</Link></Button>}
              {subscription?.stripe_customer_id && (
                <Button variant="outline" className="w-full" onClick={openPortal} disabled={Boolean(loadingAction)}>
                  {loadingAction === 'portal' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Gerenciar cobrança
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </section>


      {blockReason === 'subscription_required' && (
        <Alert className="border-primary/20 bg-primary/5">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Assinatura necessária</AlertTitle>
          <AlertDescription>Para acessar os menus e funcionalidades internas, inicie o teste grátis ou contrate um plano.</AlertDescription>
        </Alert>
      )}

      {checkoutStatus === 'success' && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <AlertTitle className="text-emerald-900">Checkout concluído</AlertTitle>
          <AlertDescription className="text-emerald-800">A assinatura será liberada assim que o Stripe confirmar o pagamento ou o início do teste.</AlertDescription>
        </Alert>
      )}

      {checkoutStatus === 'canceled' && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">Checkout cancelado</AlertTitle>
          <AlertDescription className="text-amber-800">Você pode iniciar novamente o teste grátis ou contratar um plano quando desejar.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível concluir a ação</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="grid gap-5 lg:grid-cols-3">
        {planCards.map((plan) => {
          const Icon = plan.icon
          const isCurrentPlan = subscription?.plan === plan.id || (plan.id === 'monthly' && subscription?.plan === 'trial')
          const shouldShowMigration = plan.id === 'yearly' && subscription?.plan === 'monthly' && hasAccess
          const action = shouldShowMigration ? 'migrate' : plan.id
          return (
            <Card key={plan.id} className={cn('relative flex h-full flex-col overflow-hidden border-border/80 bg-white', plan.highlighted && 'border-primary/40 shadow-clinical-lg')}>
              {plan.highlighted && (
                <div className="absolute right-4 top-4">
                  <Badge variant="success">Melhor economia</Badge>
                </div>
              )}
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <Badge variant="outline" className="w-fit">{plan.badge}</Badge>
                  <CardTitle className="pr-24">{plan.title}</CardTitle>
                  <div className="flex items-end gap-2">
                    <span className="font-display text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="pb-1 text-sm text-muted-foreground">{plan.cadence}</span>
                  </div>
                  {plan.id === 'yearly' && (
                    <p className="text-sm font-semibold text-emerald-700">R$ 718,80 por ano, com economia de R$ 240,00 ao ano.</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Gestão completa da clínica</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Pacientes, atendimentos e informações clínicas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Recursos inteligentes da plataforma</li>
                </ul>
                <div className="mt-auto space-y-2">
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                    onClick={() => shouldShowMigration ? migrateToYearly() : startCheckout(plan.id)}
                    disabled={Boolean(loadingAction) || (isCurrentPlan && !shouldShowMigration)}
                  >
                    {loadingAction === action && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCurrentPlan && !shouldShowMigration ? 'Plano atual' : shouldShowMigration ? 'Migrar para anual' : plan.cta}
                  </Button>
                  {plan.id === 'trial' && <p className="text-center text-xs text-muted-foreground">Após 7 dias, segue automaticamente no plano mensal.</p>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Todos os planos incluem acesso completo às funcionalidades do sistema.</AlertTitle>
        <AlertDescription>
          O bloqueio de acesso é validado no servidor. Sem trial ativo ou assinatura válida no Stripe, as áreas internas redirecionam para esta tela.
        </AlertDescription>
      </Alert>
    </div>
  )
}
