## Atualização diária de mercado (opcional)

Para ter preços diários de FIIs no app, use a Edge Function `update-market-quotes`.
Ela consulta uma API externa (ex.: brapi) e grava na tabela `market_quotes`.

### 1) Deploy da Edge Function
```bash
supabase functions deploy update-market-quotes
```

### 2) Variáveis de ambiente da Function
No painel do Supabase (Project Settings > Edge Functions > Secrets) configure:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BRAPI_TOKEN` (opcional, mas recomendado para FIIs)
- `BRAPI_BASE_URL` (opcional; padrão: https://brapi.dev/api/quote)

> A service_role **nunca** deve ir para o frontend.

### 3) Agendar execução diária
Você pode agendar a função via SQL usando `pg_cron` + `pg_net`:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select
  cron.schedule(
    'daily-market-quotes',
    '0 23 * * *',
    $$
    select net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/update-market-quotes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <ANON_KEY>'
      )
    );
    $$
  );
```

Use o horário que preferir (ex.: 23:00 UTC). Se quiser rodar mais vezes, ajuste o cron.

