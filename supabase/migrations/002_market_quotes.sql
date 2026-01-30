-- Market quotes (daily)
create table if not exists market_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  asset_id uuid not null references assets on delete cascade,
  date date not null,
  price numeric,
  change numeric,
  change_percent numeric,
  volume numeric,
  week_52_high numeric,
  week_52_low numeric,
  source text,
  created_at timestamptz not null default now(),
  unique (user_id, asset_id, date)
);

alter table market_quotes enable row level security;

create policy "Market quotes access" on market_quotes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_market_quotes_user_id on market_quotes(user_id);
create index if not exists idx_market_quotes_asset_id on market_quotes(asset_id);
create index if not exists idx_market_quotes_date on market_quotes(date);
