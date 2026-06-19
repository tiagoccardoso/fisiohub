#!/usr/bin/env node

import fs from 'fs'
import { Pool } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('Erro: configure DATABASE_URL com a conexão Neon/PostgreSQL antes de gerar o relatório.')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })

async function gerarRelatorioAuditoria() {
  console.log('Iniciando a geração do relatório de auditoria LGPD...')

  try {
    const { rows: logs } = await pool.query(`
      select
        l.created_at,
        l.action,
        l.entity_type,
        l.entity_id,
        l.new_values,
        l.old_values,
        l.ip_address,
        u.email as user_email,
        u.full_name as user_full_name
      from public.activity_logs l
      left join public.users u on u.id = l.user_id
      order by l.created_at desc
      limit 1000
    `)

    if (!logs.length) {
      console.log('Nenhum log de atividade encontrado.')
      return
    }

    let relatorio = '# Relatório de Auditoria de Conformidade LGPD\n\n'
    relatorio += 'Este relatório documenta as atividades registradas no sistema que são relevantes para a conformidade com a Lei Geral de Proteção de Dados (LGPD).\n\n'
    relatorio += '| Data/Hora da Ação | Usuário | Ação | Entidade Afetada | ID da Entidade | Detalhes da Alteração | Endereço IP |\n'
    relatorio += '|---|---|---|---|---|---|---|\n'

    for (const log of logs) {
      const dataHora = new Date(log.created_at).toLocaleString('pt-BR')
      const usuario = log.user_email ? `${log.user_full_name || 'Usuário'} (${log.user_email})` : 'Sistema'
      const ip = log.ip_address || 'N/A'
      let detalhes = ''

      if (log.action === 'INSERT') {
        detalhes = 'Novo registro criado.'
      } else if (log.action === 'UPDATE') {
        const oldData = log.old_values || {}
        const newData = log.new_values || {}
        const changes = Object.keys(newData).filter((key) => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]))
        detalhes = `Campos atualizados: ${changes.join(', ') || 'Nenhum'}`
      } else if (log.action === 'DELETE') {
        detalhes = 'Registro deletado.'
      } else {
        detalhes = 'Ação registrada.'
      }

      relatorio += `| ${dataHora} | ${usuario} | ${log.action} | ${log.entity_type} | ${log.entity_id || 'N/A'} | ${detalhes} | ${ip} |
`
    }

    fs.writeFileSync('RELATORIO_AUDITORIA_LGPD.md', relatorio)
    console.log('Relatório de auditoria LGPD gerado com sucesso: RELATORIO_AUDITORIA_LGPD.md')
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

gerarRelatorioAuditoria()
