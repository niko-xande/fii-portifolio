-- Asset catalog (user-managed)
create table if not exists asset_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  ticker text not null,
  name text,
  type text,
  sector text,
  created_at timestamptz not null default now(),
  unique (user_id, ticker)
);

alter table asset_catalog enable row level security;

create policy "Asset catalog access" on asset_catalog
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_asset_catalog_user_id on asset_catalog(user_id);
