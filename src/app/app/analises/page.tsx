"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import {
  fetchAssets,
  fetchFundamentals,
  fetchIncomes,
  fetchMarketQuotes,
  fetchMarketCatalogQuotes,
  fetchPositions,
  fetchSettings,
  fetchValuations,
  fetchAssetCatalog,
  upsertAsset,
  upsertFundamentals,
  upsertValuation
} from "@/lib/db";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { LoadingState, ErrorState } from "@/components/State";
import {
  calcCompositeScore,
  calcRiskScore,
  calcStabilityScore,
  getRecentMonths,
  groupIncomesByMonth
} from "@/utils/calculations";
import type {
  Asset,
  Fundamentals,
  Income,
  MarketQuote,
  Position,
  Settings,
  Valuation,
  AssetCatalog,
  MarketCatalogQuote
} from "@/types";

const emptyForm = {
  valuation_id: "",
  fundamentals_id: "",
  asset_id: "",
  price: "",
  vp_per_share: "",
  p_vp: "",
  status: "ok",
  notes: "",
  date: "",
  vacancy_physical: "",
  vacancy_financial: "",
  wault_years: "",
  debt_ratio: "",
  liquidity_daily: "",
  fundamentals_notes: ""
};

const rendaTarget = 0.12;

export default function AnalisesPage() {
  const supabase = getSupabaseBrowser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [fundamentals, setFundamentals] = useState<Fundamentals[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [catalog, setCatalog] = useState<AssetCatalog[]>([]);
  const [catalogQuotes, setCatalogQuotes] = useState<MarketCatalogQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingMarket, setUpdatingMarket] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [filter, setFilter] = useState("todos");

  const load = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    const [
      { data: assetsData, error: assetsError },
      { data: positionsData, error: positionsError },
      { data: incomesData, error: incomesError },
      { data: valuationsData, error: valuationsError },
      { data: quotesData, error: quotesError },
      { data: fundamentalsData, error: fundamentalsError },
      { data: settingsData, error: settingsError },
      { data: catalogData, error: catalogError },
      { data: catalogQuotesData, error: catalogQuotesError }
    ] = await Promise.all([
      fetchAssets(supabase),
      fetchPositions(supabase),
      fetchIncomes(supabase),
      fetchValuations(supabase),
      fetchMarketQuotes(supabase),
      fetchFundamentals(supabase),
      fetchSettings(supabase),
      fetchAssetCatalog(supabase),
      fetchMarketCatalogQuotes(supabase)
    ]);

    if (
      assetsError ||
      positionsError ||
      incomesError ||
      valuationsError ||
      quotesError ||
      fundamentalsError ||
      settingsError ||
      catalogError ||
      catalogQuotesError
    ) {
      setError("Não foi possível carregar as análises.");
    }

    setAssets(assetsData ?? []);
    setPositions(positionsData ?? []);
    setIncomes(incomesData ?? []);
    setValuations(valuationsData ?? []);
    setQuotes(quotesData ?? []);
    setFundamentals(fundamentalsData ?? []);
    setSettings(settingsData ?? null);
    setCatalog(catalogData ?? []);
    setCatalogQuotes(catalogQuotesData ?? []);
    if (!silent) {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const positionMap = useMemo(() => {
    return positions.reduce<Record<string, Position>>((acc, pos) => {
      acc[pos.asset_id] = pos;
      return acc;
    }, {});
  }, [positions]);

  const latestValuationMap = useMemo(() => {
    return valuations.reduce<Record<string, Valuation>>((acc, valuation) => {
      const existing = acc[valuation.asset_id];
      if (!existing) {
        acc[valuation.asset_id] = valuation;
      } else {
        const existingDate = existing.date || existing.created_at;
        const newDate = valuation.date || valuation.created_at;
        if (newDate > existingDate) acc[valuation.asset_id] = valuation;
      }
      return acc;
    }, {});
  }, [valuations]);

  const latestQuoteMap = useMemo(() => {
    return quotes.reduce<Record<string, MarketQuote>>((acc, quote) => {
      const existing = acc[quote.asset_id];
      if (!existing || quote.date > existing.date) {
        acc[quote.asset_id] = quote;
      }
      return acc;
    }, {});
  }, [quotes]);

  const catalogMap = useMemo(() => {
    return catalog.reduce<Record<string, AssetCatalog>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [catalog]);

  const latestCatalogQuoteMap = useMemo(() => {
    return catalogQuotes.reduce<Record<string, MarketCatalogQuote>>((acc, quote) => {
      const existing = acc[quote.catalog_id];
      if (!existing || quote.date > existing.date) {
        acc[quote.catalog_id] = quote;
      }
      return acc;
    }, {});
  }, [catalogQuotes]);

  const fundamentalsMap = useMemo(() => {
    return fundamentals.reduce<Record<string, Fundamentals>>((acc, item) => {
      acc[item.asset_id] = item;
      return acc;
    }, {});
  }, [fundamentals]);

  const incomeByAssetMonth = useMemo(() => {
    return incomes.reduce<Record<string, Record<string, number>>>((acc, income) => {
      acc[income.asset_id] = acc[income.asset_id] || {};
      acc[income.asset_id][income.month] = (acc[income.asset_id][income.month] || 0) + Number(income.amount ?? 0);
      return acc;
    }, {});
  }, [incomes]);

  const lastMonth = useMemo(() => {
    const grouped = groupIncomesByMonth(incomes);
    const months = Object.keys(grouped).sort();
    return months.slice(-1)[0] || "";
  }, [incomes]);

  const recentMonths = useMemo(() => getRecentMonths(6), []);

  const rows = assets.map((asset) => {
    const pos = positionMap[asset.id];
    const invested = pos ? Number(pos.quantity) * Number(pos.avg_price) + Number(pos.costs ?? 0) : 0;
    const valuation = latestValuationMap[asset.id];
    const quote = latestQuoteMap[asset.id];
    const fundamental = fundamentalsMap[asset.id];
    const incomeMonth = lastMonth ? incomeByAssetMonth[asset.id]?.[lastMonth] || 0 : 0;

    const monthsSorted = incomeByAssetMonth[asset.id] ? Object.keys(incomeByAssetMonth[asset.id]).sort() : [];
    const last12 = monthsSorted.slice(-12);
    const income12m = last12.reduce((sum, month) => sum + (incomeByAssetMonth[asset.id]?.[month] || 0), 0);
    const dy12m = invested ? income12m / invested : 0;

    const rendaScore = Math.round(Math.min(Math.max(dy12m / rendaTarget, 0), 1) * 100);

    const stabilityValues = recentMonths.map((month) => incomeByAssetMonth[asset.id]?.[month] || 0);
    const estabilidadeScore = calcStabilityScore(stabilityValues);

    const riskScore = calcRiskScore({
      vacancyFinancial: fundamental?.vacancy_financial ?? null,
      vacancyPhysical: fundamental?.vacancy_physical ?? null,
      debtRatio: fundamental?.debt_ratio ?? null,
      liquidityDaily: fundamental?.liquidity_daily ?? quote?.volume ?? null
    });

    const scoreTotal = calcCompositeScore({
      renda: rendaScore,
      estabilidade: estabilidadeScore,
      risco: riskScore
    });

    let signal: "oportunidade" | "neutro" | "risco" | "sem dados" = "sem dados";
    if (scoreTotal !== null && scoreTotal !== undefined) {
      if (scoreTotal >= 70) signal = "oportunidade";
      else if (scoreTotal <= 40) signal = "risco";
      else signal = "neutro";
    }

    return {
      ...asset,
      invested,
      valuation,
      quote,
      fundamental,
      dyMonthly: invested ? incomeMonth / invested : 0,
      dy12m,
      rendaScore,
      estabilidadeScore,
      riskScore,
      scoreTotal,
      signal
    };
  });

  const lastQuoteDate = useMemo(() => {
    const dates = Object.values(latestQuoteMap).map((quote) => quote.date);
    return dates.sort().slice(-1)[0] || "";
  }, [latestQuoteMap]);

  const marketRows = useMemo(() => {
    return catalog.map((item) => {
      const quote = latestCatalogQuoteMap[item.id];
      const position52 =
        quote?.price && quote.week_52_high && quote.week_52_low && quote.week_52_high !== quote.week_52_low
          ? (Number(quote.price) - Number(quote.week_52_low)) /
            (Number(quote.week_52_high) - Number(quote.week_52_low))
          : null;
      return {
        ...item,
        quote,
        position52
      };
    });
  }, [catalog, latestCatalogQuoteMap]);

  const filteredRows = rows.filter((row) => {
    if (filter === "todos") return true;
    if (filter === "oportunidade") return row.scoreTotal !== null && row.scoreTotal >= 70;
    if (filter === "risco") return row.scoreTotal !== null && row.scoreTotal <= 40;
    if (filter === "renda") return row.rendaScore >= 70;
    if (filter === "estavel") return row.estabilidadeScore !== null && row.estabilidadeScore >= 70;
    if (filter === "vacancia") {
      const threshold = settings?.alert_vacancy_pct ?? 0.15;
      const vacancy = row.fundamental?.vacancy_financial ?? row.fundamental?.vacancy_physical ?? null;
      return vacancy !== null && vacancy >= threshold;
    }
    if (filter === "sem_dados") return row.scoreTotal === null;
    return true;
  });

  const handleEdit = (asset: Asset) => {
    const valuation = latestValuationMap[asset.id];
    const fundamental = fundamentalsMap[asset.id];
    setForm({
      valuation_id: valuation?.id || "",
      fundamentals_id: fundamental?.id || "",
      asset_id: asset.id,
      price: valuation?.price?.toString() || "",
      vp_per_share: valuation?.vp_per_share?.toString() || "",
      p_vp: valuation?.p_vp?.toString() || "",
      status: asset.status || "ok",
      notes: asset.notes || "",
      date: valuation?.date || new Date().toISOString().slice(0, 10),
      vacancy_physical: fundamental?.vacancy_physical?.toString() || "",
      vacancy_financial: fundamental?.vacancy_financial?.toString() || "",
      wault_years: fundamental?.wault_years?.toString() || "",
      debt_ratio: fundamental?.debt_ratio?.toString() || "",
      liquidity_daily: fundamental?.liquidity_daily?.toString() || "",
      fundamentals_notes: fundamental?.notes || ""
    });
    setModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const price = form.price ? Number(form.price) : null;
    const vp = form.vp_per_share ? Number(form.vp_per_share) : null;
    const pvp = form.p_vp ? Number(form.p_vp) : price && vp ? price / vp : null;

    const { error: assetError } = await upsertAsset(supabase, {
      id: form.asset_id,
      notes: form.notes || null,
      status: form.status || null
    });

    if (assetError) {
      setError(assetError.message);
      return;
    }

    const { error: valuationError } = await upsertValuation(supabase, {
      id: form.valuation_id || undefined,
      asset_id: form.asset_id,
      date: form.date || null,
      price,
      vp_per_share: vp,
      p_vp: pvp
    });

    if (valuationError) {
      setError(valuationError.message);
      return;
    }

    const { error: fundamentalsError } = await upsertFundamentals(supabase, {
      id: form.fundamentals_id || undefined,
      asset_id: form.asset_id,
      vacancy_physical: form.vacancy_physical ? Number(form.vacancy_physical) : null,
      vacancy_financial: form.vacancy_financial ? Number(form.vacancy_financial) : null,
      wault_years: form.wault_years ? Number(form.wault_years) : null,
      debt_ratio: form.debt_ratio ? Number(form.debt_ratio) : null,
      liquidity_daily: form.liquidity_daily ? Number(form.liquidity_daily) : null,
      notes: form.fundamentals_notes || null
    });

    if (fundamentalsError) {
      setError(fundamentalsError.message);
      return;
    }

    setModalOpen(false);
    await load();
  };

  const handleUpdateMarket = async () => {
    setUpdatingMarket(true);
    setUpdateError(null);
    setUpdateMessage(null);

    const { data, error: updateError } = await supabase.functions.invoke("update-market-quotes", { body: {} });

    if (updateError) {
      setUpdateError(updateError.message || "Não foi possível atualizar as cotações agora.");
      setUpdatingMarket(false);
      return;
    }

    const payload = data as
      | {
          updatedAssets?: number;
          updatedCatalog?: number;
          updatedValuations?: number;
          tickers?: number;
          message?: string;
        }
      | null;

    if (payload?.message) {
      setUpdateMessage(payload.message);
    } else if (payload) {
      const updatedAssets = payload.updatedAssets ?? 0;
      const updatedCatalog = payload.updatedCatalog ?? 0;
      const updatedValuations = payload.updatedValuations ?? 0;
      const tickers = payload.tickers ?? 0;
      setUpdateMessage(
        `Atualizado: ${updatedAssets} ativos, ${updatedCatalog} catálogo, ${updatedValuations} valuations (tickers: ${tickers}).`
      );
    } else {
      setUpdateMessage("Atualização concluída.");
    }

    await load({ silent: true });
    setUpdatingMarket(false);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Análises</h2>
          <p className="text-sm text-slate-500">
            Score por renda, estabilidade e risco. Última atualização: {lastQuoteDate || "manual"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-secondary" onClick={handleUpdateMarket} disabled={updatingMarket}>
            {updatingMarket ? "Atualizando..." : "Atualizar agora"}
          </button>
        </div>
      </div>

      {updateError ? <div className="text-sm text-rose-600">{updateError}</div> : null}
      {updateMessage ? <div className="text-sm text-emerald-700">{updateMessage}</div> : null}

      <div className="flex flex-wrap gap-2">
        {[
          { key: "todos", label: "Todos" },
          { key: "oportunidade", label: "Oportunidades" },
          { key: "risco", label: "Risco" },
          { key: "renda", label: "Renda alta" },
          { key: "estavel", label: "Estáveis" },
          { key: "vacancia", label: "Vacância alta" },
          { key: "sem_dados", label: "Sem dados" }
        ].map((item) => (
          <button
            key={item.key}
            className={`btn ${filter === item.key ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ResponsiveTable
        data={filteredRows}
        emptyLabel="Cadastre ativos para analisar."
        columns={[
          { key: "ticker", label: "Ticker" },
          {
            key: "price",
            label: "Preço",
            render: (row) => (row.quote?.price ? formatCurrency(Number(row.quote.price)) : "-")
          },
          {
            key: "dy12m",
            label: "DY 12m",
            render: (row) => formatPercent(row.dy12m)
          },
          {
            key: "rendaScore",
            label: "Renda",
            render: (row) => row.rendaScore
          },
          {
            key: "estabilidadeScore",
            label: "Estabilidade",
            render: (row) => (row.estabilidadeScore !== null ? row.estabilidadeScore : "-")
          },
          {
            key: "riskScore",
            label: "Risco",
            render: (row) => (row.riskScore !== null && row.riskScore !== undefined ? row.riskScore : "-")
          },
          {
            key: "scoreTotal",
            label: "Score",
            render: (row) => (row.scoreTotal !== null && row.scoreTotal !== undefined ? row.scoreTotal : "-")
          },
          {
            key: "vacancy",
            label: "Vacância",
            render: (row) => {
              const vacancy = row.fundamental?.vacancy_financial ?? row.fundamental?.vacancy_physical ?? null;
              return vacancy !== null ? formatPercent(vacancy) : "-";
            }
          },
          {
            key: "signal",
            label: "Sinal",
            render: (row) => {
              const badge =
                row.signal === "oportunidade"
                  ? "badge-success"
                  : row.signal === "risco"
                  ? "badge-danger"
                  : row.signal === "neutro"
                  ? "badge-warning"
                  : "badge-warning";
              return <span className={`badge ${badge}`}>{row.signal}</span>;
            }
          },
          {
            key: "actions",
            label: "Ações",
            render: (row) => (
              <button className="btn btn-ghost" onClick={() => handleEdit(row)}>
                Editar
              </button>
            )
          }
        ]}
      />

      <div className="card">
        <div className="card-body text-xs text-slate-500">
          Score combina renda (DY 12m), estabilidade de proventos e risco (vacância, dívida e liquidez). Não é recomendação de investimento.
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-900">Mercado (catálogo)</h3>
          <span className="text-xs text-slate-500">Indicadores de preço</span>
        </div>
        <div className="card-body">
          <ResponsiveTable
            data={marketRows.slice(0, 15)}
            emptyLabel="Importe um catálogo para visualizar dados de mercado."
            columns={[
              { key: "ticker", label: "Ticker" },
              {
                key: "price",
                label: "Preço",
                render: (row) => (row.quote?.price ? formatCurrency(Number(row.quote.price)) : "-")
              },
              {
                key: "change",
                label: "Variação",
                render: (row) =>
                  row.quote?.change_percent !== null && row.quote?.change_percent !== undefined
                    ? formatPercent(Number(row.quote.change_percent) / 100)
                    : "-"
              },
              {
                key: "position52",
                label: "Faixa 52s",
                render: (row) =>
                  row.position52 !== null && row.position52 !== undefined
                    ? formatPercent(row.position52)
                    : "-"
              }
            ]}
          />
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Atualizar análise">
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Preço atual</label>
              <input
                type="number"
                className="input mt-1"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">VP por cota</label>
              <input
                type="number"
                className="input mt-1"
                value={form.vp_per_share}
                onChange={(event) => setForm((prev) => ({ ...prev, vp_per_share: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">P/VP (manual)</label>
            <input
              type="number"
              className="input mt-1"
              value={form.p_vp}
              onChange={(event) => setForm((prev) => ({ ...prev, p_vp: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Data da avaliação</label>
            <input
              type="date"
              className="input mt-1"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              className="select mt-1"
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="ok">Ok</option>
              <option value="atencao">Atenção</option>
              <option value="problema">Problema</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Tese / Observação</label>
            <textarea
              className="input mt-1"
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-semibold text-slate-700">Fundamentos</h4>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Vacância física (ex: 0.1 = 10%)</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.vacancy_physical}
                  onChange={(event) => setForm((prev) => ({ ...prev, vacancy_physical: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Vacância financeira (ex: 0.1 = 10%)</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.vacancy_financial}
                  onChange={(event) => setForm((prev) => ({ ...prev, vacancy_financial: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">WAULT (anos)</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.wault_years}
                  onChange={(event) => setForm((prev) => ({ ...prev, wault_years: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Dívida / Patrimônio (ex: 0.3 = 30%)</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.debt_ratio}
                  onChange={(event) => setForm((prev) => ({ ...prev, debt_ratio: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Liquidez diária (R$)</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.liquidity_daily}
                  onChange={(event) => setForm((prev) => ({ ...prev, liquidity_daily: event.target.value }))}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-600">Notas de fundamentos</label>
              <textarea
                className="input mt-1"
                rows={3}
                value={form.fundamentals_notes}
                onChange={(event) => setForm((prev) => ({ ...prev, fundamentals_notes: event.target.value }))}
              />
            </div>
          </div>

          <button className="btn btn-primary w-full" type="submit">
            Salvar análise
          </button>
        </form>
      </Modal>
    </div>
  );
}
