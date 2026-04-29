# conversion. — ERP + CRM

Plataforma integrada de gestão empresarial, CRM e projetos. React SPA com Supabase como backend.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| State (servidor) | TanStack React Query v5 |
| State (cliente) | React Context API |
| Backend | Supabase (PostgreSQL + RLS + Edge Functions) |
| Roteamento | React Router v6 |
| Formulários | react-hook-form + zod |
| i18n | Context próprio — PT-BR / EN / ES |
| Testes | Vitest + Testing Library |
| PWA | vite-plugin-pwa |

## Comandos

```bash
npm run dev          # servidor de desenvolvimento (porta 8080)
npm run build        # build de produção em dist/
npm run lint         # ESLint
npm run test         # Vitest (single run)
npm run test:watch   # Vitest (watch mode)

supabase db push     # aplicar migrations no Supabase remoto
supabase functions deploy create-user
supabase functions deploy send-scheduled-message
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_PROJECT_ID=mbrpidhebykzpdolxzyn
VITE_SUPABASE_PUBLISHABLE_KEY=   # obter em dashboard > Settings > API
VITE_SUPABASE_URL=https://mbrpidhebykzpdolxzyn.supabase.co
```

O cliente Supabase é instanciado em `src/integrations/supabase/client.ts` — não edite diretamente, use o arquivo para importar `supabase`.

## Estrutura de diretórios

```
src/
├── App.tsx                  # Providers + rotas (entry point)
├── main.tsx                 # React DOM render
├── index.css                # Tailwind base + variáveis CSS de tema
├── assets/                  # Logos e imagens estáticas
├── components/
│   ├── crm/                 # Pipeline, contatos, empresas, flows
│   ├── layout/              # AppLayout, AppSidebar, AppHeader, GlobalSearch
│   ├── projects/            # Workspace (kanban, calendar, timeline, list, approvals)
│   ├── settings/            # Tabs de configuração
│   ├── shared/              # KPICard, EmptyState, skeletons, onboarding
│   ├── tasks/               # Calendário de tarefas
│   └── ui/                  # Primitivos shadcn/ui (não editar diretamente)
├── contexts/
│   ├── AuthContext.tsx      # Sessão Supabase + role do usuário
│   ├── ProjectsContext.tsx  # CRUD de projetos
│   ├── ClientContext.tsx    # CRUD de clientes
│   ├── FinancialContext.tsx # Transações financeiras
│   └── I18nContext.tsx      # Traduções e locale ativo
├── hooks/                   # Custom hooks reutilizáveis
├── i18n/
│   └── locales/             # pt-BR.ts · en.ts · es.ts
├── integrations/supabase/
│   ├── client.ts            # Instância do supabase client
│   └── types.ts             # Tipos gerados do schema (não editar)
├── lib/                     # Utilitários (export, backup, formatação)
├── pages/
│   ├── crm/                 # Páginas do módulo CRM
│   └── projects/            # Páginas do módulo Projetos
└── types/                   # Tipos TypeScript globais (index.ts, projects.ts, permissions.ts)

supabase/
├── config.toml              # project_id
├── migrations/              # 34 arquivos SQL versionados (aplique em ordem)
└── functions/
    ├── create-user/         # Edge Function: criação de usuário
    └── send-scheduled-message/
```

## Roteamento

Todas as rotas protegidas ficam dentro de `<ProtectedRoute><AppLayout />`. Usuários com `role === 'collaborator'` são redirecionados para `/my-tasks` após login.

| Prefixo | Módulo |
|---|---|
| `/dashboard` | Dashboard principal |
| `/crm/*` | CRM (pipeline, pessoas, empresas, tarefas, follow-ups) |
| `/projects/*` | Projetos (workspace, tarefas, automações) |
| `/clients/*` | Clientes |
| `/financial/*` | Financeiro + transações |
| `/hr`, `/bi`, `/fiscal`, `/purchases` | Módulos secundários |
| `/settings` | Configurações da empresa |
| `/super-admin` | Painel multi-tenant |

## Banco de dados

- Todas as alterações de schema devem ser feitas via migration em `supabase/migrations/`.
- Nome do arquivo: `{timestamp}_{uuid}.sql` (padrão do Supabase CLI).
- RLS está habilitado em todas as tabelas — sempre avalie políticas ao adicionar colunas.
- Tipos TypeScript do banco ficam em `src/integrations/supabase/types.ts` — regenere com `supabase gen types typescript --project-id mbrpidhebykzpdolxzyn > src/integrations/supabase/types.ts` após migrations.

### Principais tabelas

| Tabela | Descrição |
|---|---|
| `projects` | Projetos com custos (labor_cost, supplies_cost, revenue, source_deal_id) |
| `crm_pipeline_deals` | Deals do funil CRM (converted_project_id para rastrear conversão) |
| `crm_contacts` | Contatos |
| `crm_companies` | Empresas |
| `clients` | Clientes vinculados a projetos |
| `transactions` | Lançamentos financeiros (income/expense, project_id) |
| `tasks` / `deliverables` / `approvals` | Gestão de tarefas e entregas |

## Internacionalização

Todas as strings visíveis ao usuário devem usar o hook `useI18n()` e ter chave em `src/i18n/locales/pt-BR.ts`, `en.ts` e `es.ts`. Nunca use texto hardcoded em PT fora dos arquivos de locale.

```tsx
const { t } = useI18n();
<span>{t('someKey')}</span>
```

## Convenções de código

- Componentes em PascalCase, arquivos `.tsx`.
- Hooks em camelCase com prefixo `use`, arquivos `.ts`.
- Imports de UI sempre via alias `@/components/ui/...`.
- Supabase client importado de `@/integrations/supabase/client`.
- Tipos de domínio em `src/types/index.ts`; tipos de projeto em `src/types/projects.ts`.
- `cn()` de `@/lib/utils` para mesclar classes Tailwind.
- Toasts via `sonner` (`import { toast } from 'sonner'`).

## Work in progress

Scope ativo em `.lovable/plan.md`:

1. **Pipeline Won/Lost** — corrigir `conversionRate` para `won/(won+lost)`, seção dedicada de Lost deals, KPIs sempre sobre todos os deals.
2. **Action Projects** — ao mover deal para Won: abre `ConvertDealToProjectDialog`, cria Project + Transactions + atualiza CRM contact/company para `status='customer'`.

Migration pendente (ainda não aplicada em produção):
```sql
ALTER TABLE public.projects
  ADD COLUMN labor_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN supplies_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN source_deal_id uuid,
  ADD COLUMN total_cost numeric GENERATED ALWAYS AS (labor_cost + supplies_cost) STORED;
ALTER TABLE public.crm_pipeline_deals
  ADD COLUMN converted_project_id uuid;
```
