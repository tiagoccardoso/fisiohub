#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada.')
  process.exit(1)
}

const migrationPath = resolve(process.cwd(), 'database', 'neon_bootstrap.sql')
const sql = readFileSync(migrationPath, 'utf8')

console.log('🚀 Aplicando bootstrap mínimo no Neon/PostgreSQL...')
const result = spawnSync('psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
  input: sql,
  stdio: ['pipe', 'inherit', 'inherit'],
  env: process.env,
})

if (result.status !== 0) {
  console.error('❌ Falha ao aplicar bootstrap mínimo.')
  process.exit(result.status || 1)
}

console.log('✅ Bootstrap mínimo aplicado com sucesso.')
