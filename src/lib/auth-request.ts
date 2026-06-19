import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-server'

export async function authenticateRequest(_req?: NextRequest): Promise<NextResponse | null> {
  const user = await getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Não autorizado: sessão inválida ou ausente' },
      { status: 401 }
    )
  }

  return null
}
