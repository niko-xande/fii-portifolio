-- FII-Portfolio schema
create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  ticker text not null,
  name text,
  type text,
  sector text,
  notes text,
  status text,
  created_at timestamptz not null default now(),
  unique (user_id, ticker)
);

create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  asset_id uuid not null references assets on delete cascade,
  quantity numeric not null,
  avg_price numeric not null,
  start_date date,
  costs numeric,
  created_at timestamptz not null default now(),
  unique (user_id, asset_id)
);

create table if not exists income_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  month text not null,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  asset_id uuid not null references assets on delete cascade,
  month text not null,
  amount numeric,
  amount_per_share numeric,
  created_at timestamptz not null default now(),
  unique (user_id, asset_id, month)
);

create table if not exists valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  asset_id uuid not null references assets on delete cascade,
  date date,
  price numeric,
  vp_per_share numeric,
  p_vp numeric,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  goal_amount numeric not null default 100000,
  alert_max_asset_pct numeric not null default 0.2,
  alert_income_drop_pct numeric not null default 0.2,
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- Trigger to auto-create profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->> 'name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table assets enable row level security;
alter table positions enable row level security;
alter table income_months enable row level security;
alter table incomes enable row level security;
alter table valuations enable row level security;
alter table settings enable row level security;

-- Policies
create policy "Profiles are viewable by owner" on profiles
  for select using (id = auth.uid());
create policy "Profiles are insertable by owner" on profiles
  for insert with check (id = auth.uid());
create policy "Profiles are editable by owner" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Assets access" on assets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Positions access" on positions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Income months access" on income_months
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Incomes access" on incomes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Valuations access" on valuations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Settings access" on settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Useful indexes
create index if not exists idx_assets_user_id on assets(user_id);
create index if not exists idx_positions_user_id on positions(user_id);
create index if not exists idx_incomes_user_id on incomes(user_id);
create index if not exists idx_valuations_user_id on valuations(user_id);
create index if not exists idx_settings_user_id on settings(user_id);
