import { Pool } from '@neondatabase/serverless'

export type DbValue = string | number | boolean | null | Date | Record<string, unknown> | unknown[]

const globalForNeon = globalThis as unknown as { __fisiohubNeonPool?: Pool }

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

  if (!globalForNeon.__fisiohubNeonPool) {
    globalForNeon.__fisiohubNeonPool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    })
  }

  return globalForNeon.__fisiohubNeonPool
}

export type TransactionClient = {
  query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: T[] }>
  release(): void
}

export async function withTransaction<T>(callback: (client: TransactionClient) => Promise<T>) {
  const client = await getNeonPool().connect()
  try {
    await client.query('begin')
    const result = await callback(client as TransactionClient)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
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
