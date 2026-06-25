import { NextResponse } from 'next/server'
import {
  getMetadataFromStripeObject,
  getStringFromStripeObject,
  hasProcessedStripeEvent,
  markStripeEventProcessed,
  retrieveStripeSubscription,
  syncStripeSubscription,
  upsertClinicSubscription,
  verifyStripeWebhook,
  type SubscriptionPlan,
} from '@/lib/billing'

async function handleCheckoutCompleted(object: Record<string, unknown>) {
  const subscriptionId = getStringFromStripeObject(object, 'subscription')
  const customerId = getStringFromStripeObject(object, 'customer')
  const metadata = getMetadataFromStripeObject(object)
  const clinicId = typeof metadata.clinic_id === 'string' ? metadata.clinic_id : null
  const userId = typeof metadata.user_id === 'string' ? metadata.user_id : null
  const plan = metadata.plan === 'trial' || metadata.plan === 'monthly' || metadata.plan === 'yearly'
    ? metadata.plan as SubscriptionPlan
    : 'unknown'

  if (subscriptionId) {
    const subscription = await retrieveStripeSubscription(subscriptionId)
    await syncStripeSubscription(subscription, { clinicId, userId, plan })
    return
  }

  if (clinicId && customerId) {
    await upsertClinicSubscription({
      clinicId,
      userId,
      stripeCustomerId: customerId,
      plan,
      status: 'incomplete',
      metadata: { checkout_session_id: getStringFromStripeObject(object, 'id') },
    })
  }
}

async function handleSubscriptionEvent(object: Record<string, unknown>) {
  const subscriptionId = getStringFromStripeObject(object, 'id')
  if (!subscriptionId) return

  const subscription = await retrieveStripeSubscription(subscriptionId)
  await syncStripeSubscription(subscription)
}

async function handleInvoiceEvent(object: Record<string, unknown>) {
  const subscriptionId = getStringFromStripeObject(object, 'subscription')
  if (!subscriptionId) return

  const subscription = await retrieveStripeSubscription(subscriptionId)
  await syncStripeSubscription(subscription)
}

export async function POST(request: Request) {
  let event: { id: string; type: string; data: { object: Record<string, unknown> } }

  try {
    const rawBody = await request.text()
    event = verifyStripeWebhook(rawBody, request.headers.get('stripe-signature'))
  } catch (error) {
    console.error('[stripe/webhook] invalid_signature', {
      message: error instanceof Error ? error.message : 'unknown_error',
    })
    return NextResponse.json({ error: 'Webhook inválido.' }, { status: 400 })
  }

  try {
    if (await hasProcessedStripeEvent(event.id)) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object)
        break
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await handleInvoiceEvent(event.data.object)
        break
      default:
        break
    }

    await markStripeEventProcessed(event.id, event.type)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[stripe/webhook] processing_error', {
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    return NextResponse.json({ error: 'Falha ao processar webhook.' }, { status: 500 })
  }
}
