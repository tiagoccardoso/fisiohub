# Limpeza de segredos antes do push no GitHub

Este projeto usa Neon/PostgreSQL como banco principal. Arquivos locais de ambiente e configuração de MCP/Cursor não devem ser versionados.

## Arquivos removidos do versionamento

Remova do Git, caso ainda estejam rastreados:

```powershell
git rm --cached --ignore-unmatch .cursor/mcp.json .env .env.local .env.production .env.vercel
git rm -r --cached --ignore-unmatch supabase/.temp
```

Você também pode executar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/security-cleanup.ps1
```

## Validação recomendada

```powershell
git ls-files .cursor/mcp.json
git grep -n "sbp_\|SUPABASE_ACCESS_TOKEN\|service_role\|ghp_\|github_pat_\|sk-\|STRIPE_SECRET_KEY\|OPENAI_API_KEY\|DEEPSEEK_API_KEY\|RESEND_API_KEY\|DATABASE_URL"
```

O comando `git ls-files .cursor/mcp.json` não deve retornar nada.

Caso o GitHub continue bloqueando o push, o segredo ainda pode existir no histórico local do commit anterior. Nesse caso, faça um novo commit sem o arquivo sensível ou reescreva o commit local antes do push.
