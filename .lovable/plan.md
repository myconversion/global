## Escopo (AC Stoneworks)

Duas entregas:
1. **Bugs Won/Lost no Pipeline** — corrigir cálculos e usabilidade.
2. **Action Projects** — quando um deal vai para Won, criar Projeto com estrutura de custos e refletir o ganho no Financeiro e no Cliente.

---

## 1. Pipeline — Won / Lost

### O que está errado hoje
- **Taxa de conversão** em `CRMPipelineAnalysis` calcula `won / total` (incluindo deals em aberto e perdidos), inflando ou achatando o número.
- Os totais dos cards Won/Lost contam **todos** os deals filtrados, mas o filtro `won/lost` muda o array `filteredDeals`, fazendo "Total Value" virar contextual e confuso.
- Só existe seção dedicada para **Won** (com lista). Para **Lost** não há nada equivalente — o usuário cai num kanban vazio.

### Correções
- `conversionRate` passa a ser `won / (won + lost)` (taxa real de fechamento). Quando `won + lost = 0`, mostra "—".
- KPIs em `CRMPipelineAnalysis` (Won, Lost, Total Value, Total Deals) sempre calculados sobre **todos** os deals do funil, ignorando o filtro de tela. Adiciona "Won Value" e "Lost Value" separados.
- Adiciona seção dedicada **Lost Deals** (espelho da Won) quando `quickFilter === 'lost'`: lista cards com motivo da perda, valor perdido e dias até a perda. Total no header.
- Cards Won/Lost no kanban ganham um indicador visual de "fechado" e ficam não-arrastáveis (evita mover de volta acidentalmente — exige confirmação).
- Confirmação ao arrastar para Won (similar ao Lost) pedindo Mão de Obra e Suprimentos (vide item 2).

---

## 2. Action Projects — Conversão Deal → Projeto

### Regra de negócio
Todo deal que vai para o estágio Won deve:
1. Pedir custos (Mão de obra, Suprimentos) → calcular Custo total e Margem.
2. Criar um **Project** vinculado ao Cliente (criando o Cliente em `clients` se ainda não existir).
3. Lançar **Transactions** no Financeiro: 1 income (ganho) + N expenses (mão de obra, suprimentos) com `project_id` setado.
4. Atualizar o registro CRM: `last_interaction_at = now()`, `status = 'customer'`.

### Gatilhos
- **Automático**: ao soltar o deal no estágio Won, abre `ConvertDealToProjectDialog` (similar ao loss reason dialog).
- **Manual**: card de deal Won (ou linha na lista) ganha botão "Converter em Projeto" caso ainda não tenha sido convertido. Se já foi convertido, mostra link "Ver Projeto".

### Schema (migração)
Adicionar em `public.projects`:
- `labor_cost numeric not null default 0`
- `supplies_cost numeric not null default 0`
- `total_cost numeric generated always as (labor_cost + supplies_cost) stored`
- `revenue numeric not null default 0`
- `source_deal_id uuid` (referência ao deal de origem; null se criado manualmente)

Em `public.crm_pipeline_deals`:
- `converted_project_id uuid` (rastreia conversão; impede duplicidade)

Índices: `idx_projects_source_deal_id`, `idx_crm_pipeline_deals_converted_project_id`.

RLS: as policies existentes em `projects` cobrem os campos novos (não exige policy nova).

### Fluxo de conversão (transacional, lado cliente)
1. Resolver/criar `clients.id`:
   - Se deal tem `crm_company_id`, procurar `clients` por nome (razão social) na company. Se não existir, inserir.
   - Senão, se tem `contact_id`, procurar/criar pelo nome do contato.
2. `INSERT INTO projects` com `name = deal.title`, `client_id`, `revenue = deal.value`, `labor_cost`, `supplies_cost`, `source_deal_id`, `status = 'active'`, `start_date = today`.
3. `INSERT INTO transactions` (3 linhas):
   - `type='income', category='Sales', value=revenue, project_id, status='paid'`
   - `type='expense', category='Labor', value=labor_cost, project_id, status='pending'` (se > 0)
   - `type='expense', category='Supplies', value=supplies_cost, project_id, status='pending'` (se > 0)
4. `UPDATE crm_pipeline_deals SET converted_project_id = ...` no deal.
5. `UPDATE crm_contacts/crm_companies SET status='customer', last_interaction_at=now()`.
6. Toast com link "Abrir Projeto" → `/projects/workspace/:id`.

Em caso de falha em qualquer passo: rollback do que foi inserido até o ponto (deletar project criado, etc.) e exibir erro claro. Não avança o deal de estágio se a conversão falhar.

### UI
- **`ConvertDealToProjectDialog`** (novo): título do deal (read-only), valor (revenue, editável), Mão de obra (input number), Suprimentos (input number), Custo total (calculado, read-only), Margem % (calculado), checkbox "Criar lançamentos no Financeiro" (default true). Botões Cancelar / Confirmar.
- Card Won mostra badge "Convertido" + link para o projeto quando `converted_project_id` existe.
- Em `ProjectDetailPage`, novo bloco "Custos" com Mão de obra, Suprimentos, Custo total, Receita e Margem; editáveis para admins.

### i18n
Novas chaves em `pt-BR.ts`, `en.ts`, `es.ts` para: `convertToProject`, `laborCost`, `suppliesCost`, `totalCost`, `revenue`, `margin`, `createFinancialEntries`, `dealConverted`, `viewProject`, `lostSection`, `totalLostValue`, `closeRate`.

---

## Detalhes técnicos

**Arquivos modificados**
- `src/components/crm/CRMPipelineAnalysis.tsx` — corrige `conversionRate`; adiciona Won/Lost value cards; KPIs sempre sobre todos os deals.
- `src/pages/crm/CRMPipelinePage.tsx` — interceptar `onDragEnd` quando destino é Won → abre `ConvertDealToProjectDialog`; adicionar seção Lost; botão "Converter" em cards Won; renderizar badge "Convertido".
- `src/components/crm/ConvertDealToProjectDialog.tsx` — **novo**.
- `src/hooks/useProjects.ts` — `createProject` aceita `laborCost`, `suppliesCost`, `revenue`, `sourceDealId`. `mapProject` lê novos campos.
- `src/types/index.ts` — `Project` ganha `laborCost`, `suppliesCost`, `totalCost`, `revenue`, `sourceDealId`.
- `src/contexts/FinancialContext.tsx` — método `createTransactionsForProject(projectId, items[])` (helper transacional).
- `src/contexts/ClientContext.tsx` — helper `findOrCreateByName(name, extras)`.
- `src/pages/ProjectDetailPage.tsx` — bloco Custos.
- `src/i18n/locales/{pt-BR,en,es}.ts` — novas chaves.

**Migração SQL (uma única migração)**
```sql
ALTER TABLE public.projects
  ADD COLUMN labor_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN supplies_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN revenue numeric NOT NULL DEFAULT 0,
  ADD COLUMN source_deal_id uuid,
  ADD COLUMN total_cost numeric GENERATED ALWAYS AS (labor_cost + supplies_cost) STORED;
ALTER TABLE public.crm_pipeline_deals
  ADD COLUMN converted_project_id uuid;
CREATE INDEX idx_projects_source_deal_id ON public.projects(source_deal_id);
CREATE INDEX idx_crm_pipeline_deals_converted_project_id ON public.crm_pipeline_deals(converted_project_id);
```

**Fora do escopo nesta entrega**
- Edição/estorno de uma conversão já feita (apenas exibição do projeto vinculado).
- Lançamentos detalhados de mão-de-obra por colaborador (apenas valor agregado).
- Permitir múltiplos projetos a partir do mesmo deal.

**Critérios de aceite**
- Taxa de conversão exibe `won/(won+lost)` ou "—".
- Filtro "Lost" exibe seção com lista de deals perdidos, motivo e total.
- Arrastar para Won abre o diálogo; ao confirmar: deal vira "Convertido", aparece projeto em `/projects` com custos preenchidos, 1 income + 2 expenses no Financeiro com `project_id`, cliente criado em `/clients` se não existia, status do contato/empresa CRM = `customer`.
- Card Won já convertido mostra badge e link "Ver Projeto"; novo clique no botão "Converter" não duplica.
