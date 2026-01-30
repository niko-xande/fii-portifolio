-- Market catalog quotes (daily)
create table if not exists market_catalog_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  catalog_id uuid not null references asset_catalog on delete cascade,
  date date not null,
  price numeric,
  change numeric,
  change_percent numeric,
  volume numeric,
  week_52_high numeric,
  week_52_low numeric,
  source text,
  created_at timestamptz not null default now(),
  unique (user_id, catalog_id, date)
);

alter table market_catalog_quotes enable row level security;

create policy "Market catalog quotes access" on market_catalog_quotes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_market_catalog_quotes_user_id on market_catalog_quotes(user_id);
create index if not exists idx_market_catalog_quotes_catalog_id on market_catalog_quotes(catalog_id);
create index if not exists idx_market_catalog_quotes_date on market_catalog_quotes(date);
