# FII-Portfolio

Sistema web para controle e análise de carteira de FIIs (Next.js + Supabase).

## ✅ Recursos
- Cadastro de ativos e posições.
- Lançamentos mensais de rendimentos.
- Dashboard com indicadores e alertas.
- Análises de P/VP e DY.
- Exportação/importação CSV.
- Multiusuário com RLS no Supabase.

## 1) Pré-requisitos
- Node.js 18+
- Conta no Supabase

## 2) Configurar Supabase
1. Crie um projeto no Supabase.
2. Execute o SQL de `supabase/migrations/001_init.sql` no SQL Editor.
3. (Opcional) Execute `supabase/seed.sql` substituindo `<USER_ID>`.
4. Copie **Project URL** e **anon key** (Settings > API).

## 3) Variáveis de ambiente
Crie `.env.local` na raiz (ou use `.env.example` como modelo):

```env
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUA-ANON-KEY"
```

> Nunca use a `service_role key` no frontend.

## 4) Rodar local
```bash
npm install
npm run dev
```
Acesse `http://localhost:3000`.

## 5) Build e deploy no Render (estático)
A forma mais simples é gerar arquivos estáticos e usar **Render Static Site**:

```bash
npm install
npm run build
```
Isso gera a pasta `out/` com HTML/CSS/JS estáticos (por causa do `output: 'export'` no Next).

**Deploy no Render (Static Site):**
1. Crie um serviço **Static Site** no Render e conecte seu repositório.
2. Build command: `npm install && npm run build`
3. Publish directory: `out`
4. Configure as variáveis de ambiente no Render (Build Environment):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> As variáveis do Supabase são embutidas no build. Se mudar as keys, é necessário novo deploy.

> Para mudanças de `.env`, você precisa gerar novo build.

## 6) Deploy alternativo (Node no Render)
Se quiser rodar como app Node (não estático), use um **Web Service** no Render:
```bash
npm run build
npm run start
```
Configure as variáveis no Render e defina:
- Build command: `npm install && npm run build`
- Start command: `npm run start`

> Para este projeto, o modo estático é suficiente e mais simples.

## 7) Segurança recomendada
- RLS habilitado em todas as tabelas.
- Policies: `user_id = auth.uid()`.
- Mantenha a anon key no frontend, jamais a service_role.
- Revise regras no Supabase para evitar acesso indevido.

## 8) Atualização diária de mercado (opcional)
Para preços diários (ex.: FIIs), use a Edge Function `update-market-quotes` que consome API externa e salva em `market_quotes`.

Resumo rápido:
- Deploy da função: `supabase functions deploy update-market-quotes`
- Configure secrets da função:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `BRAPI_TOKEN` (se sua API exigir token)
  - `BRAPI_BASE_URL` (opcional)
- Agende execução diária via `pg_cron` + `pg_net` (exemplo em `supabase/functions/update-market-quotes/README.md`)

## 9) Catálogo de ativos (autocomplete)
Para facilitar o cadastro, o app usa um **catálogo de ativos** por usuário.
Você pode importar um CSV com colunas `ticker,name,type,sector,ref_price` ou gerar o catálogo a partir dos seus ativos atuais na tela **Exportar**.

## Estrutura do projeto
- `src/app` – Rotas (App Router)
- `src/components` – Componentes UI
- `src/lib` – Supabase client, auth, helpers
- `src/utils` – Cálculos e CSV
- `supabase/` – SQL migrations e seed

## Observações
- Layout em PT-BR, responsivo e mobile-first.
- Dados de rendimentos são inseridos manualmente (sem scraping).
