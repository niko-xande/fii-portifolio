"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import {
  fetchAssets,
  fetchFundamentals,
  fetchIncomes,
  fetchMarketQuotes,
  fetchPositions,
  fetchSettings,
  fetchValuations
} from "@/lib/db";
import { KpiCard } from "@/components/KpiCard";
import { LoadingState, ErrorState, EmptyState } from "@/components/State";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { formatCurrency, formatMonth, formatPercent } from "@/lib/format";
import {
  calcAvgIncome,
  calcConcentrationByAsset,
  calcIncomeDrop,
  calcInvestedValue,
  calcOpportunityScore,
  groupIncomesByMonth
} from "@/utils/calculations";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from "recharts";
import type { Asset, Income, Position, Settings, MarketQuote, Valuation, Fundamentals } from "@/types";

const COLORS = ["#0f766e", "#f59e0b", "#475569", "#e11d48", "#0ea5e9", "#f97316"];

interface AssetDashboardRow extends Asset {
  invested: number;
  marketValue: number | null;
  marketPrice: number | null;
  priceGap: number | null;
  dy12m: number;
  score: number | null;
  signal: "oportunidade" | "neutro" | "risco" | "sem dados";
  quote?: MarketQuote;
}

export default function DashboardPage() {
  const supabase = getSupabaseBrowser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [fundamentals, setFundamentals] = useState<Fundamentals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const [
        { data: assetsData, error: assetsError },
        { data: positionsData, error: positionsError },
        { data: incomesData, error: incomesError },
        { data: settingsData, error: settingsError },
        { data: quotesData, error: quotesError },
        { data: valuationsData, error: valuationsError },
        { data: fundamentalsData, error: fundamentalsError }
      ] = await Promise.all([
        fetchAssets(supabase),
        fetchPositions(supabase),
        fetchIncomes(supabase),
        fetchSettings(supabase),
        fetchMarketQuotes(supabase),
        fetchValuations(supabase),
        fetchFundamentals(supabase)
      ]);

      if (
        assetsError ||
        positionsError ||
        incomesError ||
        settingsError ||
        quotesError ||
        valuationsError ||
        fundamentalsError
      ) {
        setError("Não foi possível carregar o dashboard. Tente novamente.");
      }

      setAssets(assetsData ?? []);
      setPositions(positionsData ?? []);
      setIncomes(incomesData ?? []);
      setSettings(settingsData ?? null);
      setQuotes(quotesData ?? []);
      setValuations(valuationsData ?? []);
      setFundamentals(fundamentalsData ?? []);
      setLoading(false);
    };

    load();
  }, [supabase]);

  const investedValue = useMemo(() => calcInvestedValue(positions), [positions]);
  const groupedIncomes = useMemo(() => groupIncomesByMonth(incomes), [incomes]);

  const incomeByMonth = useMemo(() => {
    return Object.keys(groupedIncomes)
      .sort()
      .map((month) => ({ month: formatMonth(month), value: groupedIncomes[month] }));
  }, [groupedIncomes]);


  const missingIncomeMonths = useMemo(() => {
    const missing: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groupedIncomes[monthKey]) missing.push(monthKey);
    }
    return missing;
  }, [groupedIncomes]);

  const lastMonthIncome = incomes.length
    ? groupedIncomes[Object.keys(groupedIncomes).sort().slice(-1)[0]]
    : 0;

  const avg6 = calcAvgIncome(incomes, 6);
  const avg12 = calcAvgIncome(incomes, 12);

  const progressToGoal = settings?.goal_amount ? investedValue / settings.goal_amount : 0;

  const assetMap = useMemo(() => {
    return assets.reduce<Record<string, Asset>>((acc, asset) => {
      acc[asset.id] = asset;
      return acc;
    }, {});
  }, [assets]);

  const fundamentalsMap = useMemo(() => {
    return fundamentals.reduce<Record<string, Fundamentals>>((acc, item) => {
      acc[item.asset_id] = item;
      return acc;
    }, {});
  }, [fundamentals]);

  const positionMap = useMemo(() => {
    return positions.reduce<Record<string, Position>>((acc, pos) => {
      acc[pos.asset_id] = pos;
      return acc;
    }, {});
  }, [positions]);

  const incomeByAssetMonth = useMemo(() => {
    return incomes.reduce<Record<string, Record<string, number>>>((acc, income) => {
      acc[income.asset_id] = acc[income.asset_id] || {};
      acc[income.asset_id][income.month] = (acc[income.asset_id][income.month] || 0) + Number(income.amount ?? 0);
      return acc;
    }, {});
  }, [incomes]);

  const latestQuoteMap = useMemo(() => {
    return quotes.reduce<Record<string, MarketQuote>>((acc, quote) => {
      const existing = acc[quote.asset_id];
      if (!existing || quote.date > existing.date) acc[quote.asset_id] = quote;
      return acc;
    }, {});
  }, [quotes]);

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

  const concentration = calcConcentrationByAsset(positions);

  const concentrationData = Object.entries(concentration)
    .map(([assetId, value]) => ({
      name: assetMap[assetId]?.ticker || "Ativo",
      value
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const concentrationByType = positions.reduce<Record<string, number>>((acc, pos) => {
    const type = assetMap[pos.asset_id]?.type || "outros";
    acc[type] = (acc[type] || 0) + Number(pos.quantity) * Number(pos.avg_price) + Number(pos.costs ?? 0);
    return acc;
  }, {});

  const concentrationTypeData = Object.entries(concentrationByType).map(([name, value]) => ({
    name,
    value: investedValue ? value / investedValue : 0
  }));

  const dashboardRows = useMemo<AssetDashboardRow[]>(() => {
    return assets.map((asset) => {
      const pos = positionMap[asset.id];
      const invested = pos ? Number(pos.quantity) * Number(pos.avg_price) + Number(pos.costs ?? 0) : 0;
      const quote = latestQuoteMap[asset.id];
      const valuation = latestValuationMap[asset.id];
      const marketPrice = quote?.price ?? null;
      const marketValue = marketPrice && pos ? Number(pos.quantity) * Number(marketPrice) : null;
      const priceGap = marketValue !== null && invested ? (marketValue - invested) / invested : null;

      const monthsSorted = incomeByAssetMonth[asset.id] ? Object.keys(incomeByAssetMonth[asset.id]).sort() : [];
      const last12 = monthsSorted.slice(-12);
      const income12m = last12.reduce((sum, month) => sum + (incomeByAssetMonth[asset.id]?.[month] || 0), 0);
      const dy12m = invested ? income12m / invested : 0;

      const position52 =
        quote?.price && quote.week_52_high && quote.week_52_low && quote.week_52_high !== quote.week_52_low
          ? (Number(quote.price) - Number(quote.week_52_low)) /
            (Number(quote.week_52_high) - Number(quote.week_52_low))
          : null;

      const score = calcOpportunityScore({
        dy12m,
        pvp: valuation?.p_vp ?? null,
        position52
      });

      let signal: AssetDashboardRow["signal"] = "sem dados";
      if (score !== null && score !== undefined) {
        if (score >= 70) signal = "oportunidade";
        else if (score <= 40) signal = "risco";
        else signal = "neutro";
      }

      return {
        ...asset,
        invested,
        marketValue,
        marketPrice,
        priceGap,
        dy12m,
        score,
        signal,
        quote
      };
    });
  }, [assets, positionMap, latestQuoteMap, latestValuationMap, incomeByAssetMonth]);

  const movers = useMemo(() => {
    return dashboardRows
      .filter((row) => row.quote?.change_percent !== null && row.quote?.change_percent !== undefined)
      .map((row) => ({
        ticker: row.ticker,
        changePercent: Number(row.quote?.change_percent ?? 0),
        price: row.marketPrice
      }));
  }, [dashboardRows]);

  const topGainers = [...movers].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
  const topLosers = [...movers].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);

  const marketValueTotal = dashboardRows.reduce((sum, row) => sum + (row.marketValue ?? 0), 0);
  const marketDelta = marketValueTotal - investedValue;
  const marketDeltaPct = investedValue ? marketDelta / investedValue : 0;

  const marketChartData = dashboardRows
    .filter((row) => row.invested > 0)
    .slice(0, 8)
    .map((row) => ({
      ticker: row.ticker,
      custo: row.invested,
      mercado: row.marketValue ?? 0
    }));

  const lastQuoteDate = useMemo(() => {
    const dates = Object.values(latestQuoteMap).map((quote) => quote.date);
    return dates.sort().slice(-1)[0] || "";
  }, [latestQuoteMap]);

  const maxAssetPct = Math.max(...Object.values(concentration), 0);
  const incomeDrop = calcIncomeDrop(incomes, 3);
  const missingIncome = incomes.length === 0 || missingIncomeMonths.length > 0;
  const vacancyThreshold = settings?.alert_vacancy_pct ?? 0.15;
  const assetDyDropThreshold = settings?.alert_asset_dy_drop_pct ?? 0.2;

  const vacancyAlerts = assets
    .map((asset) => {
      const fundamental = fundamentalsMap[asset.id];
      const vacancy =
        fundamental?.vacancy_financial ?? fundamental?.vacancy_physical ?? null;
      if (vacancy !== null && vacancy >= vacancyThreshold) {
        return `${asset.ticker}: vacância ${formatPercent(vacancy)}`;
      }
      return null;
    })
    .filter(Boolean) as string[];

  const assetDyDropAlerts = assets
    .map((asset) => {
      const months = incomeByAssetMonth[asset.id]
        ? Object.keys(incomeByAssetMonth[asset.id]).sort()
        : [];
      if (months.length < 4) return null;
      const last = incomeByAssetMonth[asset.id]?.[months[months.length - 1]] || 0;
      const prev = months.slice(-4, -1);
      const avgPrev =
        prev.reduce((sum, month) => sum + (incomeByAssetMonth[asset.id]?.[month] || 0), 0) /
        prev.length;
      if (!avgPrev) return null;
      const drop = (avgPrev - last) / avgPrev;
      if (drop >= assetDyDropThreshold) {
        return `${asset.ticker}: queda DY ${formatPercent(drop)}`;
      }
      return null;
    })
    .filter(Boolean) as string[];

  const alerts = [
    maxAssetPct > (settings?.alert_max_asset_pct ?? 0.2)
      ? `Concentração alta: ${formatPercent(maxAssetPct)} em um ativo.`
      : null,
    incomeDrop > (settings?.alert_income_drop_pct ?? 0.2)
      ? `Queda de renda: ${formatPercent(incomeDrop)} vs média 3m.`
      : null,
    missingIncome
      ? "Meses recentes sem rendimentos lançados. Verifique dados faltantes."
      : null,
    ...vacancyAlerts,
    ...assetDyDropAlerts
  ].filter(Boolean) as string[];

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title={error} />;

  if (!positions.length) {
    return (
      <EmptyState
        title="Comece registrando sua carteira"
        description="Cadastre ativos e posições para visualizar os indicadores."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500">
          Última atualização de mercado: {lastQuoteDate || "manual"}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Patrimônio investido" value={formatCurrency(investedValue)} />
        <KpiCard title="Valor de mercado" value={formatCurrency(marketValueTotal)} />
        <KpiCard
          title="Resultado não realizado"
          value={formatCurrency(marketDelta)}
          subtitle={formatPercent(marketDeltaPct)}
          accent={marketDelta >= 0 ? "success" : "danger"}
        />
        <KpiCard title="Renda mensal" value={formatCurrency(lastMonthIncome)} subtitle="Último mês" />
        <KpiCard title="Média 6 meses" value={formatCurrency(avg6)} />
        <KpiCard
          title="Progresso da meta"
          value={formatPercent(progressToGoal)}
          subtitle={`Meta: ${formatCurrency(settings?.goal_amount ?? 100000)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-900">Custo x mercado</h3>
            <span className="text-xs text-slate-500">Top 8 ativos</span>
          </div>
          <div className="card-body h-72">
            {marketChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ticker" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="custo" fill="#0f172a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="mercado" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-500">Sem dados de mercado suficientes.</div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-900">Maiores altas e baixas</h3>
          </div>
          <div className="card-body grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-slate-500">Altas</p>
              <div className="mt-2 space-y-2 text-sm">
                {topGainers.length ? (
                  topGainers.map((item) => (
                    <div key={item.ticker} className="flex items-center justify-between">
                      <span>{item.ticker}</span>
                      <span className="text-emerald-600">{formatPercent(item.changePercent / 100)}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500">Sem dados.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Baixas</p>
              <div className="mt-2 space-y-2 text-sm">
                {topLosers.length ? (
                  topLosers.map((item) => (
                    <div key={item.ticker} className="flex items-center justify-between">
                      <span>{item.ticker}</span>
                      <span className="text-rose-600">{formatPercent(item.changePercent / 100)}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500">Sem dados.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-900">Evolução da renda</h3>
            <span className="text-xs text-slate-500">Média 12m: {formatCurrency(avg12)}</span>
          </div>
          <div className="card-body h-64">
            {incomeByMonth.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incomeByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-500">Lance rendimentos para ver o gráfico.</div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-900">Concentração por ativo</h3>
            <span className="text-xs text-slate-500">Top 6</span>
          </div>
          <div className="card-body h-64">
            {concentrationData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={concentrationData} dataKey="value" nameKey="name" outerRadius={90}>
                    {concentrationData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPercent(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-500">Sem dados suficientes.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-900">Concentração por tipo</h3>
          </div>
          <div className="card-body space-y-3">
            {concentrationTypeData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="capitalize text-slate-600">{item.name}</span>
                <span className="font-semibold text-slate-900">{formatPercent(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-slate-900">Alertas</h3>
          </div>
          <div className="card-body space-y-2 text-sm text-slate-600">
            {alerts.length ? alerts.map((alert) => <div key={alert}>• {alert}</div>) : "Tudo em ordem."}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-slate-900">Sinais por ativo</h3>
          <span className="text-xs text-slate-500">Indicadores heurísticos</span>
        </div>
        <div className="card-body">
          <ResponsiveTable
            data={dashboardRows}
            emptyLabel="Sem ativos para analisar."
            columns={[
              { key: "ticker", label: "Ticker" },
              {
                key: "marketPrice",
                label: "Preço",
                render: (row) => (row.marketPrice ? formatCurrency(row.marketPrice) : "-")
              },
              {
                key: "invested",
                label: "Custo",
                render: (row) => formatCurrency(row.invested)
              },
              {
                key: "priceGap",
                label: "Diferença",
                render: (row) =>
                  row.priceGap !== null && row.priceGap !== undefined ? formatPercent(row.priceGap) : "-"
              },
              {
                key: "dy12m",
                label: "DY 12m",
                render: (row) => formatPercent(row.dy12m)
              },
              {
                key: "score",
                label: "Score",
                render: (row) => (row.score !== null && row.score !== undefined ? `${row.score}` : "-")
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
                      : "badge-warning";
                  return <span className={`badge ${badge}`}>{row.signal}</span>;
                }
              }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
