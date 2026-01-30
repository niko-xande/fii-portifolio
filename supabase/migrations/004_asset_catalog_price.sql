-- Add optional reference price to asset catalog
alter table asset_catalog
  add column if not exists ref_price numeric;
