import { NextResponse } from 'next/server'
import { assertNeonConfigured, pingDatabase } from '@/lib/db-neon'

export async function GET() {
  try {
    const configured = Boolean(assertNeonConfigured())
    const ping = configured ? await pingDatabase() : null

    return NextResponse.json({
      status: configured && ping?.ok === 1 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        provider: 'neon-postgres',
        configured,
        connected: ping?.ok === 1,
        checkedAt: ping?.now ?? null,
      },
      auth: {
        cookieSecretConfigured: Boolean(process.env.NEON_AUTH_COOKIE_SECRET),
        neonAuthBaseUrlConfigured: Boolean(process.env.NEON_AUTH_BASE_URL),
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
