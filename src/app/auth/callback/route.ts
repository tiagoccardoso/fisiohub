import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Fluxo antigo de callback do provedor anterior removido.
  // O login/cadastro do FisioHub agora usa /api/auth/login e /api/auth/signup com Neon/PostgreSQL.
  return NextResponse.redirect(new URL('/', request.url))
}
