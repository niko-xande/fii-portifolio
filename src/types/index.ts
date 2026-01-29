export type AssetType = "tijolo" | "papel" | "hibrido" | "outros";

export interface Asset {
  id: string;
  user_id: string;
  ticker: string;
  name: string | null;
  type: AssetType | null;
  sector: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

export interface Position {
  id: string;
  user_id: string;
  asset_id: string;
  quantity: number;
  avg_price: number;
  start_date: string | null;
  costs: number | null;
  created_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  asset_id: string;
  month: string;
  amount: number | null;
  amount_per_share: number | null;
  created_at: string;
}

export interface Valuation {
  id: string;
  user_id: string;
  asset_id: string;
  date: string | null;
  price: number | null;
  vp_per_share: number | null;
  p_vp: number | null;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  goal_amount: number;
  alert_max_asset_pct: number;
  alert_income_drop_pct: number;
  created_at: string;
}
