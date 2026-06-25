import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-server'
import { getCurrentSubscription, SUBSCRIPTION_ACCESS_STATUSES } from '@/lib/billing'

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ authenticated: false, hasAccess: false }, { status: 401 })
  }

  try {
    const subscription = await getCurrentSubscription(user.clinic_id)
    const hasAccess = Boolean(subscription && SUBSCRIPTION_ACCESS_STATUSES.has(subscription.status))

    return NextResponse.json({
      authenticated: true,
      hasAccess,
      plan: subscription?.plan ?? null,
      status: subscription?.status ?? null,
      trialEnd: subscription?.trial_end ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
    }, { status: hasAccess ? 200 : 402 })
  } catch (error) {
    console.error('[billing/access] validation_error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    return NextResponse.json({
      authenticated: true,
      hasAccess: false,
      error: 'Não foi possível validar a assinatura. Verifique se a migration de assinaturas foi aplicada.',
    }, { status: 402 })
  }
}
