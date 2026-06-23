# Integração dos módulos ao Neon

## Diagnóstico

| Tela | Causa encontrada |
| --- | --- |
| Painel | A API Neon existia, mas a página ainda mantinha dados de demonstração e um painel avançado estático. |
| Cadernos | Os hooks e a página de cadastro ainda chamavam o cliente compatível do Supabase, que não persiste no Neon. |
| Projetos | Consultas, mutations e a página alternativa usavam mocks/Supabase; o botão Novo Projeto não renderizava formulário. |
| Equipe | Havia apenas consulta e cadastro via API. A tela não expunha edição, inativação ou reativação. |
| Calendário | Os componentes utilizavam hooks Supabase, inclusive realtime e notificações, sem Route Handler Neon. |
| Análise | Parte dos indicadores era fixa e não havia entidade persistente para análises salvas. |
| Colaboração | A tela mostrava um documento fictício e os hooks dependiam de comentários, versões e presença do Supabase. |
| Tarefas | A rota Neon existia, mas a tela Kanban usava uma tarefa local de exemplo sem persistência. |
| Configurações | Somente parte do perfil era atualizável; dados completos da clínica e preferências não possuíam fluxo de edição. |

## Implementação

- Route Handlers validam a sessão no servidor e obtêm `user.id` e `clinic_id` da sessão assinada.
- Toda consulta e alteração inclui `clinic_id`; referências de projeto, usuário, paciente e participante são verificadas no servidor.
- Operações administrativas da Equipe e da clínica exigem papel `admin`.
- O último administrador ativo e o próprio administrador autenticado não podem ser inativados ou rebaixados.
- Cadernos privados respeitam proprietário, colaboradores e permissões de leitura/escrita.
- Criações e alterações invalidam os caches do Painel e dos módulos relacionados.
- Datas do Calendário são convertidas no navegador para ISO antes da persistência em `timestamptz`.
- Indicadores de Análise são calculados a partir de pacientes e eventos reais, sem percentuais de demonstração.

## Aplicação no banco

Execute `database/20260623_management_modules_neon.sql` no Neon SQL Editor antes do deploy.
Ela adiciona somente os campos de endereço completo da clínica e a tabela `analysis_reports`, sem remover dados.
