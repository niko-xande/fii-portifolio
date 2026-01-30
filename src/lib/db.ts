import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset, Position, Income, Valuation, Settings, MarketQuote, AssetCatalog, Fundamentals } from "@/types";

export const fetchAssets = async (supabase: SupabaseClient) => {
  return supabase.from("assets").select("*").order("ticker");
};

export const upsertAsset = async (supabase: SupabaseClient, payload: Partial<Asset>) => {
  return supabase.from("assets").upsert(payload).select("*").single();
};

export const deleteAsset = async (supabase: SupabaseClient, id: string) => {
  return supabase.from("assets").delete().eq("id", id);
};

export const fetchPositions = async (supabase: SupabaseClient) => {
  return supabase.from("positions").select("*");
};

export const upsertPosition = async (supabase: SupabaseClient, payload: Partial<Position>) => {
  return supabase
    .from("positions")
    .upsert(payload, { onConflict: "user_id,asset_id" })
    .select("*")
    .single();
};

export const fetchIncomes = async (supabase: SupabaseClient) => {
  return supabase.from("incomes").select("*");
};

export const upsertIncome = async (supabase: SupabaseClient, payload: Partial<Income>) => {
  return supabase
    .from("incomes")
    .upsert(payload, { onConflict: "user_id,asset_id,month" })
    .select("*")
    .single();
};

export const deleteIncome = async (supabase: SupabaseClient, id: string) => {
  return supabase.from("incomes").delete().eq("id", id);
};

export const fetchValuations = async (supabase: SupabaseClient) => {
  return supabase.from("valuations").select("*");
};

export const upsertValuation = async (supabase: SupabaseClient, payload: Partial<Valuation>) => {
  return supabase.from("valuations").upsert(payload).select("*").single();
};

export const fetchSettings = async (supabase: SupabaseClient) => {
  return supabase.from("settings").select("*").limit(1).maybeSingle();
};

export const upsertSettings = async (supabase: SupabaseClient, payload: Partial<Settings>) => {
  return supabase
    .from("settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();
};

export const fetchMarketQuotes = async (supabase: SupabaseClient) => {
  return supabase.from("market_quotes").select("*").order("date", { ascending: false });
};

export const fetchMarketCatalogQuotes = async (supabase: SupabaseClient) => {
  return supabase.from("market_catalog_quotes").select("*").order("date", { ascending: false });
};

export const fetchFundamentals = async (supabase: SupabaseClient) => {
  return supabase.from("fundamentals").select("*");
};

export const upsertFundamentals = async (supabase: SupabaseClient, payload: Partial<Fundamentals>) => {
  return supabase
    .from("fundamentals")
    .upsert(payload, { onConflict: "user_id,asset_id" })
    .select("*")
    .single();
};

export const fetchAssetCatalog = async (supabase: SupabaseClient) => {
  return supabase.from("asset_catalog").select("*").order("ticker");
};

export const upsertAssetCatalog = async (supabase: SupabaseClient, payload: Partial<AssetCatalog>) => {
  return supabase
    .from("asset_catalog")
    .upsert(payload, { onConflict: "user_id,ticker" })
    .select("*")
    .single();
};
