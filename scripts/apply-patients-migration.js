#!/usr/bin/env node

/**
 * Script para aplicar a migração do módulo de pacientes no Neon/PostgreSQL.
 *
 * Configure DATABASE_URL no ambiente antes de executar.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool } from '@neondatabase/serverless'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('Erro: configure DATABASE_URL com a conexão Neon/PostgreSQL antes de executar a migração.')
  process.exit(1)
}

const migrationPath = path.join(__dirname, '../supabase/migrations/20250628180000_add_patients_module.sql')
const pool = new Pool({ connectionString: databaseUrl })

async function applyPatientsMigration() {
  try {
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Arquivo de migração não encontrado: ${migrationPath}`)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log('Aplicando migração do módulo de pacientes no Neon/PostgreSQL...')
    await pool.query(migrationSQL)
    console.log('Migração aplicada com sucesso.')
  } catch (error) {
    console.error('Erro ao executar migração:', error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

applyPatientsMigration()
