"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { fetchAssets, fetchIncomes, fetchPositions, fetchSettings } from "@/lib/db";
import { KpiCard } from "@/components/KpiCard";
import { LoadingState, ErrorState, EmptyState } from "@/components/State";
import { formatCurrency, formatMonth, formatPercent } from "@/lib/format";
import { calcAvgIncome, calcConcentrationByAsset, calcIncomeDrop, calcInvestedValue, groupIncomesByMonth } from "@/utils/calculations";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import type { Asset, Income, Position, Settings } from "@/types";

const COLORS = ["#0f766e", "#f59e0b", "#475569", "#e11d48", "#0ea5e9", "#f97316"];

export default function DashboardPage() {
  const supabase = getSupabaseBrowser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const [{ data: assetsData, error: assetsError }, { data: positionsData, error: positionsError }, { data: incomesData, error: incomesError }, { data: settingsData, error: settingsError }] = await Promise.all([
        fetchAssets(supabase),
        fetchPositions(supabase),
        fetchIncomes(supabase),
        fetchSettings(supabase)
      ]);

      if (assetsError || positionsError || incomesError || settingsError) {
        setError("Não foi possível carregar o dashboard. Tente novamente.");
      }

      setAssets(assetsData ?? []);
      setPositions(positionsData ?? []);
      setIncomes(incomesData ?? []);
      setSettings(settingsData ?? null);
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

  const maxAssetPct = Math.max(...Object.values(concentration), 0);
  const incomeDrop = calcIncomeDrop(incomes, 3);
  const missingIncome = incomes.length === 0 || missingIncomeMonths.length > 0;
  const alerts = [
    maxAssetPct > (settings?.alert_max_asset_pct ?? 0.2)
      ? `Concentração alta: ${formatPercent(maxAssetPct)} em um ativo.`
      : null,
    incomeDrop > (settings?.alert_income_drop_pct ?? 0.2)
      ? `Queda de renda: ${formatPercent(incomeDrop)} vs média 3m.`
      : null,
    missingIncome
      ? "Meses recentes sem rendimentos lançados. Verifique dados faltantes."
      : null
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
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard title="Patrimônio investido" value={formatCurrency(investedValue)} />
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
    </div>
  );
}
