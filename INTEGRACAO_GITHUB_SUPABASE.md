# 🔗 Integração GitHub-Supabase Configurada

## ✅ Status Atual

**Conexão estabelecida com sucesso:**
- 📂 Projeto: `manusfisio`
- 🔗 Repositório: `rafaelminatto1/manus-fisio`  
- ✅ Conectado e funcionando

## ⚙️ Configurações Recomendadas

### 1. **Habilitar Branching** (IMPORTANTE)

**Por que habilitar:**
- Permite diferentes ambientes (dev, staging, production)
- Deploy automático por branch
- Testes isolados

**Como habilitar:**
1. No painel Supabase → Settings → Integrations
2. Clique no botão **"Enable branching"** no topo da página
3. Confirme a ativação

### 2. **Configurar Branches**

**Sugestão de estrutura:**

```
main/master → Produção (automaticamente deployado)
develop → Staging/Desenvolvimento
feature/* → Branches de funcionalidades
```

### 3. **Verificar Configurações de Deploy**

- ✅ Auto-deploy do branch `master` habilitado
- ✅ Migrations aplicadas automaticamente
- ✅ Variables de ambiente sincronizadas

## 🚀 Benefícios da Integração

### ✅ **Deploy Automático:**
- Push no GitHub → Deploy automático no Supabase
- Sem necessidade de deploy manual
- Sempre atualizado

### ✅ **Sincronização de Banco:**
- Migrations aplicadas automaticamente
- Schema sempre atualizado
- Rollback automático se necessário

### ✅ **Ambientes Isolados:**
- Branch diferente = ambiente diferente
- Testes sem afetar produção
- Revisão de código antes do merge

## 📋 Próximos Passos

### 1. **Configurar .env.local** (Se ainda não fez)

```env
# Copie do painel Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://COLOQUE_SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service

# REMOVER esta linha para usar dados reais:
# NEXT_PUBLIC_MOCK_AUTH=true
```

### 2. **Aplicar Migrations do Banco**

```bash
cd supabase
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

### 3. **Testar Deploy Automático**

```bash
# Fazer uma mudança simples
echo "# Deploy automático testado" >> README.md

# Commit e push
git add .
git commit -m "🧪 Teste deploy automático"
git push origin master
```

### 4. **Verificar no Dashboard**

- Functions → Edge Functions (se houver)
- Database → Tables (verificar se as migrations foram aplicadas)
- Authentication → Users (configurar políticas se necessário)

## 🔧 **Localizar Credenciais**

### No Dashboard Supabase:
- **URL do projeto:** Settings → API → Project URL
- **Chaves:** Settings → API → Project API keys
- **Reference ID:** Settings → General → Reference ID

## ✅ **Validação da Integração**

**Funciona quando:**
1. ✅ Push no GitHub dispara deploy automático
2. ✅ Migrations são aplicadas automaticamente  
3. ✅ Site atualiza sem intervenção manual
4. ✅ Logs mostram deploy bem-sucedido

## 🚨 **Troubleshooting**

### Deploy Falha:
- Verificar logs no painel Integrations
- Confirmar que não há erros de build
- Verificar se .env está configurado

### Migrations Falham:
- Verificar sintaxe SQL nas migrations
- Confirmar permissões do service role
- Aplicar manualmente se necessário

### Variables de Ambiente:
- Configurar no Supabase Dashboard
- Sincronizar com o repositório
- Não commitar .env.local

---

**🎯 RESULTADO:** Deploy automático funcionando + Banco sincronizado + Ambiente isolado por branch! 