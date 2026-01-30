// Supabase Edge Function: update-market-quotes
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const brapiToken = Deno.env.get("BRAPI_TOKEN") ?? "";
const brapiBaseUrl = Deno.env.get("BRAPI_BASE_URL") ?? "https://brapi.dev/api/quote";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

interface QuoteResult {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketTime?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

const fetchQuote = async (ticker: string): Promise<QuoteResult | null> => {
  const url = new URL(`${brapiBaseUrl}/${ticker}`);
  if (brapiToken) {
    url.searchParams.set("token", brapiToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "fii-portfolio/1.0"
    }
  });

  if (!response.ok) {
    console.warn(`Failed to fetch ${ticker}: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const result = data?.results?.[0];
  if (!result?.symbol) return null;

  return result as QuoteResult;
};

Deno.serve(async (req) => {
  try {
    const { data: assets, error } = await supabase
      .from("assets")
      .select("id, user_id, ticker");

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!assets?.length) {
      return new Response(JSON.stringify({ message: "No assets found" }), { status: 200 });
    }

    const uniqueTickers = Array.from(new Set(assets.map((asset) => asset.ticker)));
    const quotesByTicker: Record<string, QuoteResult> = {};

    for (const ticker of uniqueTickers) {
      const quote = await fetchQuote(ticker);
      if (quote?.regularMarketPrice) {
        quotesByTicker[ticker] = quote;
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const rows = assets
      .map((asset) => {
        const quote = quotesByTicker[asset.ticker];
        if (!quote) return null;
        const date = quote.regularMarketTime
          ? new Date(quote.regularMarketTime).toISOString().slice(0, 10)
          : today;

        return {
          user_id: asset.user_id,
          asset_id: asset.id,
          date,
          price: quote.regularMarketPrice ?? null,
          change: quote.regularMarketChange ?? null,
          change_percent: quote.regularMarketChangePercent ?? null,
          volume: quote.regularMarketVolume ?? null,
          week_52_high: quote.fiftyTwoWeekHigh ?? null,
          week_52_low: quote.fiftyTwoWeekLow ?? null,
          source: "brapi"
        };
      })
      .filter(Boolean);

    if (!rows.length) {
      return new Response(JSON.stringify({ message: "No quotes collected" }), { status: 200 });
    }

    const { error: upsertError } = await supabase
      .from("market_quotes")
      .upsert(rows, { onConflict: "user_id,asset_id,date" });

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({
        updated: rows.length,
        tickers: Object.keys(quotesByTicker).length
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
