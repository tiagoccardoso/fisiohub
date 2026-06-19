import { Pool } from '@neondatabase/serverless'

export type DbValue = string | number | boolean | null | Date | Record<string, unknown> | unknown[]

const globalForNeon = globalThis as unknown as { __fisiosysNeonPool?: Pool }

export const getDatabaseUrl = () => process.env.DATABASE_URL || ''
export const getUnpooledConnectionString = () => process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || ''

export const assertNeonConfigured = () => {
  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não está configurada no servidor.')
  }
  return databaseUrl
}

export function getNeonPool() {
  const connectionString = assertNeonConfigured()

  if (!globalForNeon.__fisiosysNeonPool) {
    globalForNeon.__fisiosysNeonPool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    })
  }

  return globalForNeon.__fisiosysNeonPool
}

export async function query<T = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T[]> {
  const result = await getNeonPool().query(text, values)
  return result.rows as T[]
}

export async function queryOne<T = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, values)
  return rows[0] ?? null
}

export async function execute(text: string, values: unknown[] = []) {
  return getNeonPool().query(text, values)
}

export async function pingDatabase() {
  const row = await queryOne<{ ok: number; now: string }>('select 1 as ok, now()::text as now')
  if (!row?.ok) throw new Error('Não foi possível validar a conexão com o Neon.')
  return row
}

export function compactObject<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}

export function toJsonb(value: unknown) {
  if (value === undefined || value === null) return '{}'
  return JSON.stringify(value)
}
