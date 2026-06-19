# Migração Supabase -> Neon Postgres

## Estado atual identificado
- O projeto usa Supabase para **Auth**, **queries SQL via PostgREST**, **RPC**, e **Realtime** em múltiplos hooks/client components.
- Migrations SQL já existem em `supabase/migrations/*.sql` e schema consolidado em `supabase/complete_database_setup.sql`.
- Não foi identificado ORM (Prisma/Drizzle/Kysely/Sequelize). O acesso é majoritariamente por `@supabase/supabase-js`.

## Estratégia aplicada
1. Neon passa a ser o banco principal via `DATABASE_URL`.
2. Foi criada camada server-side centralizada em `src/lib/db-neon.ts` para validar configuração do Neon.
3. Endpoint de health atualizado para validar configuração Neon: `src/app/api/health/route.ts`.
4. Supabase Auth permanece temporariamente para não quebrar login/sessão até migração completa de autenticação.
5. Schema completo foi versionado para Neon em `database/neon_full_schema.sql` (derivado do schema consolidado atual).

## Variáveis de ambiente
- `DATABASE_URL` (pooled para runtime)
- `DATABASE_URL_UNPOOLED` (direta para dump/restore/migration)
- Variáveis Supabase mantidas temporariamente apenas para autenticação e fluxos ainda não migrados.

## Dump/Restore (exemplo sem secrets)
```bash
# Exportar schema + dados do Supabase (usar URL direta/unpooled)
pg_dump "$SUPABASE_DB_URL_UNPOOLED" --format=custom --no-owner --no-acl --file=supabase.dump

# Restaurar no Neon (usar URL direta/unpooled)
pg_restore --no-owner --no-acl --clean --if-exists --dbname="$DATABASE_URL_UNPOOLED" supabase.dump
```

## Validações pós-importação
```bash
psql "$SUPABASE_DB_URL_UNPOOLED" -c "select 'users' as table, count(*) from users"
psql "$DATABASE_URL_UNPOOLED" -c "select 'users' as table, count(*) from users"

psql "$SUPABASE_DB_URL_UNPOOLED" -c "select 'projects' as table, count(*) from projects"
psql "$DATABASE_URL_UNPOOLED" -c "select 'projects' as table, count(*) from projects"
```

## Observações de segurança
- Neon substitui Postgres, **não** substitui Supabase Auth automaticamente.
- Enquanto Supabase Auth existir, manter validação de sessão no backend e nunca expor `SERVICE_ROLE_KEY` no client.
- RLS/policies devem ser executadas no Postgres do Neon (schema SQL já contém políticas existentes), além de checagens em rotas server-side.

## Próximos passos recomendados
1. Migrar gradualmente rotas/hooks que fazem `supabase.from(...)` para APIs server-side que usem `DATABASE_URL`.
2. Substituir realtime (se necessário) por alternativa dedicada (ex.: websockets/trigger+queue).
3. Planejar migração de Auth para Auth.js/Clerk ou manter Supabase Auth isolado até completa transição.
