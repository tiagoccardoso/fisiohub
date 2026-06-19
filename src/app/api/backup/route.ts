import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { pingDatabase } from '@/lib/db-neon'

export async function POST(req: NextRequest) {
  try {
    await requireRole(['admin'])
    const { backup_type } = await req.json().catch(() => ({ backup_type: 'manual' }))
    await pingDatabase()

    return NextResponse.json({
      status: 'success',
      message:
        `Solicitação de cópia de segurança ${backup_type || 'manual'} validada. ` +
        'Para exportar o Neon use o painel da Neon ou pg_dump com DATABASE_URL_UNPOOLED.',
      backupId: `neon_backup_request_${Date.now()}`,
    })
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === 'Não autorizado'
    const forbidden = error instanceof Error && error.message === 'Permissões insuficientes'
    return NextResponse.json(
      { error: unauthorized ? 'Não autorizado' : forbidden ? 'Permissões insuficientes' : 'Erro interno do servidor' },
      { status: unauthorized ? 401 : forbidden ? 403 : 500 }
    )
  }
}
