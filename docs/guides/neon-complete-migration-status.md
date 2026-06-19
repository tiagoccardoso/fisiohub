# Migração para Neon + Neon Auth — status de implementação

## O que foi concluído nesta etapa
1. **Inventário técnico completo** dos pontos acoplados ao Supabase (auth, middleware, APIs, hooks, clientes e SQL).
2. **SQL completo para PostgreSQL/Neon** preparado em `database/neon_full_schema_postgres.sql` (baseado no schema consolidado atual do projeto, com ajustes para execução em Neon).
3. **SQL bootstrap mínimo** em `database/neon_bootstrap.sql` para provisionamento inicial rápido.
4. **Hardening de segurança**: remoção de fallbacks inseguros com URL/chave mock/hardcoded em código de autenticação/backup.
5. **Variáveis de ambiente Neon Auth** adicionadas ao `env.example`.

## Bloqueador objetivo no ambiente atual
- O ambiente bloqueia instalação de dependências npm (erro 403), inclusive SDKs necessários para integração oficial Neon Auth em Next.js.
- Sem o SDK oficial não é possível finalizar handlers/middleware/cookies/sessão Neon Auth com fidelidade de produção.

## Próximo passo para fechamento 100%
Assim que o ambiente permitir instalar pacotes, executar:
- instalar SDK oficial Neon Auth (Next.js server/client),
- trocar `middleware.ts`, `src/hooks/use-auth-fixed.tsx`, `src/components/auth/login-form.tsx`, `src/app/auth/callback/route.ts` e helpers de sessão para o runtime Neon Auth,
- migrar FKs de identidade para `app_users.neon_auth_user_id` + sincronização com tabela de identidade do Neon Auth,
- validar E2E (cadastro, login, logout, sessão, permissões e rotas protegidas).
