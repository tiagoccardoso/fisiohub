import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { createBillingPortalSession } from '@/lib/billing'

export async function POST() {
  try {
    const user = await requireAuth()
    const session = await createBillingPortalSession(user)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/portal] error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    })

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Não foi possível abrir o portal de cobrança.',
    }, { status: 500 })
  }
}
