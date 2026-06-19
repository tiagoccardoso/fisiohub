# Auditoria técnica: migração para Neon + Neon Auth

## Diagnóstico atual
- O projeto está fortemente acoplado ao Supabase (`@supabase/supabase-js`, `@supabase/ssr`, helpers de auth, middleware e hooks).
- O fluxo de login/cadastro/logout usa `supabase.auth.*` diretamente no frontend (`use-auth-fixed.tsx`).
- O middleware de proteção usa sessão Supabase e bypass em mock/dev.
- A base SQL atual referencia `auth.users` (modelo Supabase) em múltiplas tabelas.

## Causa raiz de incompatibilidade com Neon Auth
1. **Acoplamento de SDK**: o código depende da API do Supabase Auth.
2. **Schema de identidade**: FKs apontam para `auth.users`, que não existe em Neon Auth no mesmo formato.
3. **Configuração de ambiente**: variáveis centrais ainda são Supabase (`NEXT_PUBLIC_SUPABASE_*`).
4. **RLS/funções**: funções usam `auth.uid()` (padrão Supabase), exigindo adaptação para Neon Auth.

## Entidades e fluxos que dependem de banco/auth
- Auth/session: `src/hooks/use-auth-fixed.tsx`, `src/middleware.ts`, `src/lib/auth.ts`, `src/lib/auth-server.ts`, `src/components/auth/login-form.tsx`.
- API de dados: `src/app/api/**` (patients, tasks, analytics, physiotherapy, mcp, backup).
- Camada DB client: `src/lib/supabase.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`.
- Tipos de banco: `src/types/database.types.ts`.

## Estratégia segura de migração
1. Introduzir camada de abstração de auth (adapter) sem quebrar telas.
2. Trocar endpoints de auth para Neon Auth (handler dedicado).
3. Migrar tabela de perfil para `app_users` vinculada a `neon_auth_user_id`.
4. Migrar queries gradualmente de Supabase SDK para driver PostgreSQL/ORM.
5. Revisar RLS para usar claims/tokens do Neon Auth.

## Status neste commit
- Adicionado `database/neon_bootstrap.sql` com estrutura inicial PostgreSQL compatível com Neon (perfil de app, projetos, tarefas, índices, constraints e triggers).
- Atualizado `env.example` com variáveis necessárias de Neon Auth.

## Pendências manuais obrigatórias
- Instalar SDK oficial Neon Auth no projeto (bloqueado por política de pacote no ambiente atual).
- Implementar handlers/cookies de sessão Neon Auth.
- Refatorar rotas API e hooks que hoje usam Supabase.
- Rodar validação fim-a-fim (cadastro/login/logout/RLS/perfis).
