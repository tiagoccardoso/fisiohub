import { createHmac, timingSafeEqual } from 'crypto'
import { query, queryOne, execute } from '@/lib/db-neon'
import type { User } from '@/lib/auth-server'

export type BillingPlan = 'trial' | 'monthly' | 'yearly'
export type SubscriptionPlan = BillingPlan | 'unknown'

export type AppSubscription = {
  id: string
  clinic_id: string
  user_id: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  plan: SubscriptionPlan
  status: string
  trial_start: string | null
  trial_end: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at: string | null
  canceled_at: string | null
  cancel_at_period_end: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

type StripeMetadata = Record<string, string | number | boolean | null | undefined>
type StripeObject = Record<string, unknown>

type CheckoutSession = {
  id: string
  url: string | null
  customer?: string | null
  subscription?: string | null
  metadata?: StripeMetadata | null
}

type StripeSubscription = {
  id: string
  customer?: string | { id?: string } | null
  status?: string
  metadata?: StripeMetadata | null
  trial_start?: number | null
  trial_end?: number | null
  current_period_start?: number | null
  current_period_end?: number | null
  cancel_at?: number | null
  canceled_at?: number | null
  cancel_at_period_end?: boolean | null
  items?: {
    data?: Array<{
      id?: string
      price?: {
        id?: string
      }
    }>
  }
}

type StripeEvent = {
  id: string
  type: string
  data: {
    object: StripeObject
  }
}

export const SUBSCRIPTION_ACCESS_STATUSES = new Set(['active', 'trialing'])
export const SUBSCRIPTION_BLOCKED_STATUSES = new Set([
  'canceled',
  'incomplete_expired',
  'past_due',
  'unpaid',
  'paused',
  'incomplete',
])

export const BILLING_PLANS: Record<BillingPlan, {
  id: BillingPlan
  name: string
  commercialPrice: string
  description: string
  priceEnv: 'STRIPE_PRICE_ID_MONTHLY' | 'STRIPE_PRICE_ID_ANNUAL'
}> = {
  trial: {
    id: 'trial',
    name: 'Teste grátis por 7 dias',
    commercialPrice: 'R$ 0,00 por 7 dias',
    description: 'Acesso completo por 7 dias. Ao final do teste, a assinatura segue automaticamente no plano mensal.',
    priceEnv: 'STRIPE_PRICE_ID_MONTHLY',
  },
  monthly: {
    id: 'monthly',
    name: 'Plano Mensal',
    commercialPrice: 'R$ 79,90/mês',
    description: 'Flexibilidade para começar com todos os recursos da plataforma.',
    priceEnv: 'STRIPE_PRICE_ID_MONTHLY',
  },
  yearly: {
    id: 'yearly',
    name: 'Plano Anual',
    commercialPrice: 'R$ 59,90/mês',
    description: 'Equivale a R$ 718,80 por ano e gera economia de R$ 240,00 ao ano.',
    priceEnv: 'STRIPE_PRICE_ID_ANNUAL',
  },
}

function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY não está configurada no servidor.')
  }
  return secretKey
}

export function getAppUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (!value) return 'http://localhost:3000'
  return value.startsWith('http') ? value.replace(/\/$/, '') : `https://${value.replace(/\/$/, '')}`
}

export function getPriceIdForPlan(plan: BillingPlan) {
  const config = BILLING_PLANS[plan]
  const priceId = process.env[config.priceEnv]
  if (!priceId) {
    throw new Error(`${config.priceEnv} não está configurada no servidor.`)
  }
  return priceId
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function timestampToIso(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return new Date(value * 1000).toISOString()
}

function encodeParams(params: Record<string, string | number | boolean | null | undefined>) {
  const body = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    body.append(key, String(value))
  })
  return body
}

export async function stripeRequest<T = StripeObject>(path: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      ...(options.body instanceof URLSearchParams
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : {}),
      ...(options.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({})) as StripeObject
  if (!response.ok) {
    const error = payload.error as { message?: string } | undefined
    throw new Error(error?.message || 'Não foi possível concluir a comunicação com o Stripe.')
  }

  return payload as T
}

export async function getCurrentSubscription(clinicId: string) {
  return queryOne<AppSubscription>(
    `select id,
            clinic_id,
            user_id,
            stripe_customer_id,
            stripe_subscription_id,
            stripe_price_id,
            plan,
            status,
            trial_start::text,
            trial_end::text,
            current_period_start::text,
            current_period_end::text,
            cancel_at::text,
            canceled_at::text,
            cancel_at_period_end,
            metadata,
            created_at::text,
            updated_at::text
       from public.clinic_subscriptions
      where clinic_id = $1
      order by updated_at desc
      limit 1`,
    [clinicId]
  )
}

export async function getCurrentSubscriptionByCustomer(customerId: string) {
  return queryOne<AppSubscription>(
    `select id,
            clinic_id,
            user_id,
            stripe_customer_id,
            stripe_subscription_id,
            stripe_price_id,
            plan,
            status,
            trial_start::text,
            trial_end::text,
            current_period_start::text,
            current_period_end::text,
            cancel_at::text,
            canceled_at::text,
            cancel_at_period_end,
            metadata,
            created_at::text,
            updated_at::text
       from public.clinic_subscriptions
      where stripe_customer_id = $1
      order by updated_at desc
      limit 1`,
    [customerId]
  )
}

export async function hasValidSubscription(clinicId: string) {
  const subscription = await getCurrentSubscription(clinicId)
  if (!subscription) return false
  return SUBSCRIPTION_ACCESS_STATUSES.has(subscription.status)
}

export async function upsertClinicSubscription(input: {
  clinicId: string
  userId?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  plan?: SubscriptionPlan
  status: string
  trialStart?: string | null
  trialEnd?: string | null
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  cancelAt?: string | null
  canceledAt?: string | null
  cancelAtPeriodEnd?: boolean | null
  metadata?: Record<string, unknown>
}) {
  const metadata = input.metadata ?? {}
  const rows = await query<AppSubscription>(
    `insert into public.clinic_subscriptions (
       clinic_id,
       user_id,
       stripe_customer_id,
       stripe_subscription_id,
       stripe_price_id,
       plan,
       status,
       trial_start,
       trial_end,
       current_period_start,
       current_period_end,
       cancel_at,
       canceled_at,
       cancel_at_period_end,
       metadata,
       updated_at
     ) values (
       $1, $2, $3, $4, $5, $6, $7,
       $8::timestamptz, $9::timestamptz, $10::timestamptz, $11::timestamptz,
       $12::timestamptz, $13::timestamptz, $14, $15::jsonb, now()
     )
     on conflict (clinic_id) do update set
       user_id = coalesce(excluded.user_id, public.clinic_subscriptions.user_id),
       stripe_customer_id = coalesce(excluded.stripe_customer_id, public.clinic_subscriptions.stripe_customer_id),
       stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.clinic_subscriptions.stripe_subscription_id),
       stripe_price_id = coalesce(excluded.stripe_price_id, public.clinic_subscriptions.stripe_price_id),
       plan = excluded.plan,
       status = excluded.status,
       trial_start = excluded.trial_start,
       trial_end = excluded.trial_end,
       current_period_start = excluded.current_period_start,
       current_period_end = excluded.current_period_end,
       cancel_at = excluded.cancel_at,
       canceled_at = excluded.canceled_at,
       cancel_at_period_end = excluded.cancel_at_period_end,
       metadata = public.clinic_subscriptions.metadata || excluded.metadata,
       updated_at = now()
     returning id,
               clinic_id,
               user_id,
               stripe_customer_id,
               stripe_subscription_id,
               stripe_price_id,
               plan,
               status,
               trial_start::text,
               trial_end::text,
               current_period_start::text,
               current_period_end::text,
               cancel_at::text,
               canceled_at::text,
               cancel_at_period_end,
               metadata,
               created_at::text,
               updated_at::text`,
    [
      input.clinicId,
      input.userId ?? null,
      input.stripeCustomerId ?? null,
      input.stripeSubscriptionId ?? null,
      input.stripePriceId ?? null,
      input.plan ?? 'unknown',
      input.status,
      input.trialStart ?? null,
      input.trialEnd ?? null,
      input.currentPeriodStart ?? null,
      input.currentPeriodEnd ?? null,
      input.cancelAt ?? null,
      input.canceledAt ?? null,
      input.cancelAtPeriodEnd ?? false,
      JSON.stringify(metadata),
    ]
  )

  if (input.stripeCustomerId || input.stripeSubscriptionId) {
    await execute(
      `update public.clinics
          set stripe_customer_id = coalesce($2, stripe_customer_id),
              stripe_subscription_id = coalesce($3, stripe_subscription_id),
              updated_at = now()
        where id = $1`,
      [input.clinicId, input.stripeCustomerId ?? null, input.stripeSubscriptionId ?? null]
    )
  }

  const subscription = rows[0]
  if (!subscription) throw new Error('Não foi possível salvar a assinatura.')
  return subscription
}

export function resolvePlanFromPrice(priceId?: string | null, metadataPlan?: unknown): SubscriptionPlan {
  if (metadataPlan === 'trial' || metadataPlan === 'monthly' || metadataPlan === 'yearly') {
    return metadataPlan
  }
  if (priceId && process.env.STRIPE_PRICE_ID_MONTHLY && priceId === process.env.STRIPE_PRICE_ID_MONTHLY) return 'monthly'
  if (priceId && process.env.STRIPE_PRICE_ID_ANNUAL && priceId === process.env.STRIPE_PRICE_ID_ANNUAL) return 'yearly'
  return 'unknown'
}

export async function createCheckoutSession(user: User, plan: BillingPlan) {
  const priceId = getPriceIdForPlan(plan)
  const existingSubscription = await getCurrentSubscription(user.clinic_id).catch(() => null)
  const appUrl = getAppUrl()
  const metadata = {
    user_id: user.id,
    clinic_id: user.clinic_id,
    plan,
  }

  const params: Record<string, string | number | boolean | null | undefined> = {
    mode: 'subscription',
    customer: existingSubscription?.stripe_customer_id ?? undefined,
    customer_email: existingSubscription?.stripe_customer_id ? undefined : user.email,
    client_reference_id: user.id,
    success_url: `${appUrl}/assinatura?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/assinatura?checkout=canceled`,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': 1,
    'metadata[user_id]': metadata.user_id,
    'metadata[clinic_id]': metadata.clinic_id,
    'metadata[plan]': metadata.plan,
    'subscription_data[metadata][user_id]': metadata.user_id,
    'subscription_data[metadata][clinic_id]': metadata.clinic_id,
    'subscription_data[metadata][plan]': metadata.plan,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  }

  if (plan === 'trial') {
    params.payment_method_collection = 'always'
    params['subscription_data[trial_period_days]'] = 7
    params['subscription_data[metadata][plan]'] = 'trial'
    params['metadata[plan]'] = 'trial'
  }

  return stripeRequest<CheckoutSession>('/checkout/sessions', {
    method: 'POST',
    body: encodeParams(params),
  })
}

export async function createBillingPortalSession(user: User) {
  const subscription = await getCurrentSubscription(user.clinic_id)
  if (!subscription?.stripe_customer_id) {
    throw new Error('Nenhum customer Stripe foi encontrado para esta clínica.')
  }

  const appUrl = getAppUrl()
  return stripeRequest<{ id: string; url: string }>('/billing_portal/sessions', {
    method: 'POST',
    body: encodeParams({
      customer: subscription.stripe_customer_id,
      return_url: `${appUrl}/assinatura`,
    }),
  })
}

export async function retrieveStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`)
}

export async function updateSubscriptionToYearly(subscriptionId: string) {
  const yearlyPriceId = getPriceIdForPlan('yearly')
  const subscription = await retrieveStripeSubscription(subscriptionId)
  const itemId = subscription.items?.data?.[0]?.id
  if (!itemId) {
    throw new Error('Não foi possível localizar o item da assinatura no Stripe.')
  }

  return stripeRequest<StripeSubscription>(`/subscriptions/${subscriptionId}`, {
    method: 'POST',
    body: encodeParams({
      'items[0][id]': itemId,
      'items[0][price]': yearlyPriceId,
      proration_behavior: 'create_prorations',
      'metadata[plan]': 'yearly',
    }),
  })
}

export async function syncStripeSubscription(subscription: StripeSubscription, fallback?: {
  clinicId?: string | null
  userId?: string | null
  plan?: SubscriptionPlan
}) {
  const stripeCustomerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id ?? null
  const stripePriceId = subscription.items?.data?.[0]?.price?.id ?? null
  const metadata = subscription.metadata ?? {}
  const clinicIdFromMetadata = asString(metadata.clinic_id)
  const userIdFromMetadata = asString(metadata.user_id)
  let clinicId = fallback?.clinicId ?? clinicIdFromMetadata
  const userId = fallback?.userId ?? userIdFromMetadata

  if (!clinicId && stripeCustomerId) {
    const existing = await getCurrentSubscriptionByCustomer(stripeCustomerId)
    clinicId = existing?.clinic_id ?? null
  }

  if (!clinicId || !subscription.id) {
    throw new Error('Evento Stripe sem clinic_id ou subscription_id reconhecível.')
  }

  const metadataPlan = fallback?.plan ?? metadata.plan
  const plan = metadataPlan === 'trial' && subscription.status !== 'trialing'
    ? 'monthly'
    : resolvePlanFromPrice(stripePriceId, metadataPlan)
  return upsertClinicSubscription({
    clinicId,
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId,
    plan,
    status: subscription.status ?? 'unknown',
    trialStart: timestampToIso(subscription.trial_start),
    trialEnd: timestampToIso(subscription.trial_end),
    currentPeriodStart: timestampToIso(subscription.current_period_start),
    currentPeriodEnd: timestampToIso(subscription.current_period_end),
    cancelAt: timestampToIso(subscription.cancel_at),
    canceledAt: timestampToIso(subscription.canceled_at),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    metadata: {
      stripe_last_sync: new Date().toISOString(),
      ...metadata,
    },
  })
}

export function verifyStripeWebhook(rawBody: string, stripeSignature: string | null) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET não está configurada no servidor.')
  }
  if (!stripeSignature) {
    throw new Error('Assinatura do webhook Stripe ausente.')
  }

  const values = stripeSignature.split(',').reduce<Record<string, string[]>>((acc, entry) => {
    const [key, value] = entry.split('=')
    if (!key || !value) return acc
    acc[key] = [...(acc[key] ?? []), value]
    return acc
  }, {})

  const timestamp = values.t?.[0]
  const signatures = values.v1 ?? []
  if (!timestamp || signatures.length === 0) {
    throw new Error('Assinatura do webhook Stripe inválida.')
  }

  const timestampMs = Number(timestamp) * 1000
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    throw new Error('Timestamp do webhook Stripe fora da janela permitida.')
  }

  const expected = createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody}`).digest('hex')
  const expectedBuffer = Buffer.from(expected)

  const isValid = signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature)
    return signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer)
  })

  if (!isValid) {
    throw new Error('Assinatura do webhook Stripe não confere.')
  }

  return JSON.parse(rawBody) as StripeEvent
}

export async function hasProcessedStripeEvent(eventId: string) {
  const event = await queryOne<{ id: string }>('select id from public.stripe_events where id = $1 limit 1', [eventId])
  return Boolean(event)
}

export async function markStripeEventProcessed(eventId: string, eventType: string) {
  await execute(
    `insert into public.stripe_events (id, event_type, processed_at)
     values ($1, $2, now())
     on conflict (id) do nothing`,
    [eventId, eventType]
  )
}

export function getStringFromStripeObject(object: StripeObject, key: string) {
  const value = object[key]
  return typeof value === 'string' ? value : null
}

export function getMetadataFromStripeObject(object: StripeObject) {
  const value = object.metadata
  return value && typeof value === 'object' && !Array.isArray(value) ? value as StripeMetadata : {}
}
