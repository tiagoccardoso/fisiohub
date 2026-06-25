import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { createCheckoutSession, type BillingPlan } from '@/lib/billing'

function isBillingPlan(value: unknown): value is BillingPlan {
  return value === 'trial' || value === 'monthly' || value === 'yearly'
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json().catch(() => ({})) as { plan?: unknown }

    if (!isBillingPlan(body.plan)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
    }

    const session = await createCheckoutSession(user, body.plan)
    if (!session.url) {
      return NextResponse.json({ error: 'O Stripe não retornou uma URL de checkout.' }, { status: 502 })
    }

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error('[stripe/checkout] error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.',
    }, { status: 500 })
  }
}
