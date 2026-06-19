# Sistema de Gestão para Clínica de Fisioterapia

![Vercel](https://therealsujitk-vercel-badge.vercel.app/?app=manus-fisio-git-master-rafaelminatto1&style=for-the-badge)

Um sistema completo de gestão para clínicas de fisioterapia, inspirado no Painel Lumi e construído com as mais modernas tecnologias web. O objetivo é fornecer uma solução integrada para gestão de pacientes, agendamentos, exercícios, finanças e automação com IA.

Este projeto é desenvolvido seguindo as diretrizes do documento `prompt_final_sistema_fisioterapia.md`.

## 🚀 Stack Tecnológico

- **Frontend**: [Next.js](https://nextjs.org/) 15+, [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
- **Backend & Banco de Dados**: [Neon](https://neon.com/) (PostgreSQL) + Neon Auth (em migração final)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Gestão de Estado (Client-side)**: [TanStack Query](https://tanstack.com/query/latest) (React Query)
- **Deployment**: [Vercel](https://vercel.com/)
- **Validação de Formulários**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

## 📦 Módulos Funcionais

O sistema é dividido nos seguintes módulos principais:

1.  **Gestão de Pacientes e Prontuários Eletrônicos:** Cadastro completo, prontuário eletrônico específico para fisioterapia e documentação legal.
2.  **Biblioteca de Exercícios e Prescrição:** Organização por especialidades, vídeos demonstrativos e prescrição personalizada com envio via WhatsApp.
3.  **Agendamento e Gestão de Consultas:** Calendário inteligente, agendamento online e gestão completa de consultas.
4.  **Área do Paciente (Portal Web/Mobile):** Painel do paciente, acompanhamento de exercícios e comunicação com o fisioterapeuta.
5.  **Gestão de Tarefas (Estilo Trello):** Quadro Kanban para tarefas clínicas e administrativas.
6.  **Inteligência Artificial e Automação:** Sugestões de exercícios, análise preditiva e assistente de documentação.
7.  **Sistema Financeiro e Marketing:** Gestão de pagamentos, recibos e ferramentas de marketing.
8.  **Relatórios e Análises:** Painéis interativos com relatórios clínicos e gerenciais.

## 🗺️ Roadmap de Desenvolvimento

O desenvolvimento segue o seguinte roadmap:

-   **✅ Fase 1 - MVP (Concluído)**
    -   [x] Cadastro de pacientes e prontuários básicos
    -   [x] Agendamento simples
    -   [x] Biblioteca básica de exercícios
    -   [x] Sistema de login e permissões
    -   [x] Interface responsiva básica

-   **🔄 Fase 2 - Funcionalidades Avançadas (Em Andamento)**
    -   [ ] Área do paciente completa
    -   [ ] Sistema de tarefas estilo Kanban
    -   [ ] Relatórios básicos
    -   [ ] Integração com WhatsApp
    -   [ ] Documentação legal automática

-   **▶️ Fase 3 - IA e Automação (Próxima Fase)**
    -   [ ] Sistema de recomendação de exercícios
    -   [ ] Análise preditiva de evolução
    -   [ ] Automação de documentos
    -   [ ] Análises avançadas

-   **▶️ Fase 4 - Otimização e Escala (Futuro)**
    -   [ ] Otimização de performance
    -   [ ] Recursos avançados de IA
    -   [ ] Suporte multi-clínica

## 🛠️ Como Rodar o Projeto Localmente

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/rafaelminatto1/manus-fisio.git
    cd manus-fisio
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**
    - Renomeie o arquivo `.env.example` para `.env.local`.
    - Preencha as variáveis com sua configuração Neon:
      ```env
      DATABASE_URL=COLOQUE_SUA_DATABASE_URL_AQUI
      DATABASE_URL_UNPOOLED=COLOQUE_SUA_DATABASE_URL_AQUI
      NEON_AUTH_BASE_URL=https://<project>.neon.tech/auth
      NEXT_PUBLIC_NEON_AUTH_BASE_URL=https://<project>.neon.tech/auth
      NEON_AUTH_COOKIE_SECRET=<secret>
      ```

4.  **Execute o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```

5.  Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 🔒 Segurança e Compliance (LGPD)

O sistema é desenvolvido com foco na segurança e conformidade com a Lei Geral de Proteção de Dados (LGPD):

-   **Criptografia de Dados Sensíveis**: As informações dos pacientes são armazenadas de forma segura.
-   **Controle de Acesso por Perfil**: Usuários (Admin, Fisioterapeuta, Paciente) têm acesso apenas às informações pertinentes à sua função.
-   **Log de Auditoria**: Todas as ações críticas são registradas.
-   **Cópia de Segurança Automática**: Rotinas de backup devem ser configuradas no Neon/PostgreSQL para garantir a integridade dos dados.
-   **Consentimento**: O sistema inclui termos de consentimento para uso de imagem e tratamento de dados.

---
**Autor:** Manus AI 