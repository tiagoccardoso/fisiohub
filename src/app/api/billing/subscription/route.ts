import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-server'
import { getCurrentSubscription, SUBSCRIPTION_ACCESS_STATUSES } from '@/lib/billing'

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const subscription = await getCurrentSubscription(user.clinic_id)
    return NextResponse.json({
      subscription,
      hasAccess: Boolean(subscription && SUBSCRIPTION_ACCESS_STATUSES.has(subscription.status)),
    })
  } catch (error) {
    console.error('[billing/subscription] load_error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    return NextResponse.json({
      error: 'Não foi possível carregar a assinatura. Verifique se a migration de assinaturas foi aplicada no Neon.',
    }, { status: 500 })
  }
}
