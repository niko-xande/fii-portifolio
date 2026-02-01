// Supabase Edge Function: update-market-quotes
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const brapiToken = Deno.env.get("BRAPI_TOKEN") ?? "";
const brapiBaseUrl = Deno.env.get("BRAPI_BASE_URL") ?? "https://brapi.dev/api/quote";
const brapiModules = Deno.env.get("BRAPI_MODULES") ?? "defaultKeyStatistics";

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
  priceToBook?: number;
  bookValue?: number;
  defaultKeyStatistics?: {
    priceToBook?: number;
    bookValue?: number;
  };
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getQuoteDate = (quote: QuoteResult, fallback: string) => {
  if (!quote.regularMarketTime) return fallback;
  const parsed = new Date(quote.regularMarketTime);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 10);
};

const getBookValue = (quote: QuoteResult) => {
  return (
    toNumber(quote.defaultKeyStatistics?.bookValue) ??
    toNumber(quote.bookValue) ??
    null
  );
};

const getPriceToBook = (quote: QuoteResult) => {
  return (
    toNumber(quote.defaultKeyStatistics?.priceToBook) ??
    toNumber(quote.priceToBook) ??
    null
  );
};

const fetchQuote = async (ticker: string): Promise<QuoteResult | null> => {
  const url = new URL(`${brapiBaseUrl}/${ticker}`);
  if (brapiToken) {
    url.searchParams.set("token", brapiToken);
  }
  if (brapiModules) {
    url.searchParams.set("modules", brapiModules);
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

Deno.serve(async () => {
  try {
    const [{ data: assets, error: assetsError }, { data: catalog, error: catalogError }] = await Promise.all([
      supabase.from("assets").select("id, user_id, ticker"),
      supabase.from("asset_catalog").select("id, user_id, ticker")
    ]);

    if (assetsError || catalogError) {
      return new Response(JSON.stringify({ error: assetsError?.message || catalogError?.message }), { status: 500 });
    }

    const assetRows = assets ?? [];
    const catalogRows = catalog ?? [];

    const uniqueTickers = Array.from(
      new Set([...assetRows.map((asset) => asset.ticker), ...catalogRows.map((item) => item.ticker)])
    );

    if (!uniqueTickers.length) {
      return new Response(JSON.stringify({ message: "No tickers found" }), { status: 200 });
    }

    const quotesByTicker: Record<string, QuoteResult> = {};

    for (const ticker of uniqueTickers) {
      const quote = await fetchQuote(ticker);
      if (quote?.regularMarketPrice) {
        quotesByTicker[ticker] = quote;
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    const assetQuotes = assetRows
      .map((asset) => {
        const quote = quotesByTicker[asset.ticker];
        if (!quote) return null;
        const date = getQuoteDate(quote, today);

        return {
          user_id: asset.user_id,
          asset_id: asset.id,
          date,
          price: toNumber(quote.regularMarketPrice),
          change: toNumber(quote.regularMarketChange),
          change_percent: toNumber(quote.regularMarketChangePercent),
          volume: toNumber(quote.regularMarketVolume),
          week_52_high: toNumber(quote.fiftyTwoWeekHigh),
          week_52_low: toNumber(quote.fiftyTwoWeekLow),
          source: "brapi"
        };
      })
      .filter(Boolean);

    const catalogQuotes = catalogRows
      .map((item) => {
        const quote = quotesByTicker[item.ticker];
        if (!quote) return null;
        const date = getQuoteDate(quote, today);

        return {
          user_id: item.user_id,
          catalog_id: item.id,
          date,
          price: toNumber(quote.regularMarketPrice),
          change: toNumber(quote.regularMarketChange),
          change_percent: toNumber(quote.regularMarketChangePercent),
          volume: toNumber(quote.regularMarketVolume),
          week_52_high: toNumber(quote.fiftyTwoWeekHigh),
          week_52_low: toNumber(quote.fiftyTwoWeekLow),
          source: "brapi"
        };
      })
      .filter(Boolean);

    const valuationCandidates = assetRows
      .map((asset) => {
        const quote = quotesByTicker[asset.ticker];
        if (!quote) return null;
        const date = getQuoteDate(quote, today);
        const price = toNumber(quote.regularMarketPrice);
        const vpPerShare = getBookValue(quote);
        const pvpFromApi = getPriceToBook(quote);
        const pvpComputed =
          pvpFromApi ??
          (price !== null && vpPerShare !== null && vpPerShare !== 0
            ? price / vpPerShare
            : null);

        if (price === null && vpPerShare === null && pvpComputed === null) return null;

        return {
          user_id: asset.user_id,
          asset_id: asset.id,
          date,
          price,
          vp_per_share: vpPerShare,
          p_vp: pvpComputed
        };
      })
      .filter(Boolean) as Array<{
      user_id: string;
      asset_id: string;
      date: string;
      price: number | null;
      vp_per_share: number | null;
      p_vp: number | null;
    }>;

    if (assetQuotes.length) {
      const { error: upsertError } = await supabase
        .from("market_quotes")
        .upsert(assetQuotes, { onConflict: "user_id,asset_id,date" });

      if (upsertError) {
        return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
      }
    }

    if (catalogQuotes.length) {
      const { error: catalogUpsertError } = await supabase
        .from("market_catalog_quotes")
        .upsert(catalogQuotes, { onConflict: "user_id,catalog_id,date" });

      if (catalogUpsertError) {
        return new Response(JSON.stringify({ error: catalogUpsertError.message }), { status: 500 });
      }
    }

    let updatedValuations = 0;
    if (valuationCandidates.length) {
      const assetIds = Array.from(new Set(valuationCandidates.map((item) => item.asset_id)));
      const dates = Array.from(new Set(valuationCandidates.map((item) => item.date)));
      const { data: existingValuations, error: existingValuationsError } = await supabase
        .from("valuations")
        .select("id, asset_id, date")
        .in("asset_id", assetIds)
        .in("date", dates);

      if (existingValuationsError) {
        return new Response(JSON.stringify({ error: existingValuationsError.message }), { status: 500 });
      }

      const existingMap = new Set(
        (existingValuations ?? []).map((item) => `${item.asset_id}:${item.date}`)
      );

      const valuationsToInsert = valuationCandidates.filter(
        (item) => !existingMap.has(`${item.asset_id}:${item.date}`)
      );

      if (valuationsToInsert.length) {
        const { error: valuationInsertError } = await supabase
          .from("valuations")
          .insert(valuationsToInsert);

        if (valuationInsertError) {
          return new Response(JSON.stringify({ error: valuationInsertError.message }), { status: 500 });
        }

        updatedValuations = valuationsToInsert.length;
      }
    }

    return new Response(
      JSON.stringify({
        updatedAssets: assetQuotes.length,
        updatedCatalog: catalogQuotes.length,
        updatedValuations,
        tickers: Object.keys(quotesByTicker).length
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
