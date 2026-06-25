import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getCurrentSubscription, syncStripeSubscription, updateSubscriptionToYearly } from '@/lib/billing'

export async function POST() {
  try {
    const user = await requireAuth()
    const currentSubscription = await getCurrentSubscription(user.clinic_id)

    if (!currentSubscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura mensal ativa foi encontrada para migração.' }, { status: 404 })
    }

    if (currentSubscription.plan === 'yearly') {
      return NextResponse.json({ ok: true, subscription: currentSubscription })
    }

    const stripeSubscription = await updateSubscriptionToYearly(currentSubscription.stripe_subscription_id)
    const subscription = await syncStripeSubscription(stripeSubscription, {
      clinicId: user.clinic_id,
      userId: user.id,
      plan: 'yearly',
    })

    return NextResponse.json({ ok: true, subscription })
  } catch (error) {
    console.error('[stripe/subscription/migrate] error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Não foi possível migrar a assinatura para o plano anual.',
    }, { status: 500 })
  }
}
