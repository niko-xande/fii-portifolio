-- Fundamentals & alert settings
create table if not exists fundamentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  asset_id uuid not null references assets on delete cascade,
  vacancy_physical numeric,
  vacancy_financial numeric,
  wault_years numeric,
  debt_ratio numeric,
  liquidity_daily numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

alter table fundamentals enable row level security;

create policy "Fundamentals access" on fundamentals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_fundamentals_user_id on fundamentals(user_id);
create index if not exists idx_fundamentals_asset_id on fundamentals(asset_id);

alter table settings
  add column if not exists alert_vacancy_pct numeric not null default 0.15,
  add column if not exists alert_asset_dy_drop_pct numeric not null default 0.2;
