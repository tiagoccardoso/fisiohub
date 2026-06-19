#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool } from '@neondatabase/serverless'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const schemaPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'database', 'neon_full_schema.sql')

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('Erro: configure DATABASE_URL com a conexão Neon/PostgreSQL antes de aplicar o schema.')
  process.exit(1)
}

if (!fs.existsSync(schemaPath)) {
  console.error(`Erro: arquivo de schema não encontrado: ${schemaPath}`)
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })

async function applySchema() {
  try {
    const sql = fs.readFileSync(schemaPath, 'utf8')
    console.log(`Aplicando schema no Neon/PostgreSQL: ${path.relative(process.cwd(), schemaPath)}`)
    await pool.query(sql)
    console.log('Schema aplicado com sucesso.')
  } catch (error) {
    console.error('Erro ao aplicar schema:', error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

applySchema()
