# Script completo do banco Supabase

Para criar o banco de dados do Manus Fisio em um projeto Supabase novo, use o script consolidado:

```text
supabase/complete_database_setup.sql
```

## Como executar

1. Acesse o projeto no Supabase Dashboard.
2. Abra **SQL Editor**.
3. Copie todo o conteúdo de `supabase/complete_database_setup.sql`.
4. Cole no editor e execute.
5. Aguarde a mensagem final: `Manus Fisio: banco de dados criado/atualizado com sucesso.`

## O que o script cria

O script consolida em um único arquivo:

- Extensões e enums do PostgreSQL.
- Tabelas base: usuários, cadernos, páginas, projetos, tarefas e colaboração.
- Tabelas clínicas: pacientes, prontuários, avaliações, sessões e prescrições.
- Calendário, notificações e preferências de notificação.
- Biblioteca de exercícios, prescrições e execuções.
- Índices, triggers de `updated_at`, funções de permissão e políticas RLS.
- Funções de analytics usadas pelo painel.
- Dados iniciais seguros para a biblioteca de exercícios.

## Observação

Este arquivo substitui a necessidade de copiar várias migrations manualmente para um banco novo. Se você usa Supabase CLI em desenvolvimento local, continue preferindo o fluxo versionado de migrations.
