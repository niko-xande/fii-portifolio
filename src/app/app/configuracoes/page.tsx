"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { fetchSettings, upsertSettings } from "@/lib/db";
import { LoadingState, ErrorState } from "@/components/State";

export default function ConfiguracoesPage() {
  const supabase = getSupabaseBrowser();
  const [goalAmount, setGoalAmount] = useState("100000");
  const [maxAssetPct, setMaxAssetPct] = useState("0.2");
  const [incomeDropPct, setIncomeDropPct] = useState("0.2");
  const [vacancyPct, setVacancyPct] = useState("0.15");
  const [assetDyDropPct, setAssetDyDropPct] = useState("0.2");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error: settingsError } = await fetchSettings(supabase);
      if (settingsError) setError("Não foi possível carregar as configurações.");
      if (data) {
        setGoalAmount(data.goal_amount?.toString() || "100000");
        setMaxAssetPct(data.alert_max_asset_pct?.toString() || "0.2");
        setIncomeDropPct(data.alert_income_drop_pct?.toString() || "0.2");
        setVacancyPct(data.alert_vacancy_pct?.toString() || "0.15");
        setAssetDyDropPct(data.alert_asset_dy_drop_pct?.toString() || "0.2");
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const { error: saveError } = await upsertSettings(supabase, {
      goal_amount: Number(goalAmount),
      alert_max_asset_pct: Number(maxAssetPct),
      alert_income_drop_pct: Number(incomeDropPct),
      alert_vacancy_pct: Number(vacancyPct),
      alert_asset_dy_drop_pct: Number(assetDyDropPct)
    });
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setMessage("Configurações salvas com sucesso.");
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title={error} />;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Configurações</h2>
        <p className="text-sm text-slate-500">Defina metas e alertas.</p>
      </div>
      <form className="card" onSubmit={handleSave}>
        <div className="card-body space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Meta de patrimônio (R$)</label>
            <input
              type="number"
              className="input mt-1"
              value={goalAmount}
              onChange={(event) => setGoalAmount(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Alerta de concentração (ex: 0.2 = 20%)</label>
            <input
              type="number"
              className="input mt-1"
              value={maxAssetPct}
              onChange={(event) => setMaxAssetPct(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Alerta de queda de renda (ex: 0.2 = 20%)</label>
            <input
              type="number"
              className="input mt-1"
              value={incomeDropPct}
              onChange={(event) => setIncomeDropPct(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Alerta de vacância alta (ex: 0.15 = 15%)</label>
            <input
              type="number"
              className="input mt-1"
              value={vacancyPct}
              onChange={(event) => setVacancyPct(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Alerta de queda de DY por ativo (ex: 0.2 = 20%)</label>
            <input
              type="number"
              className="input mt-1"
              value={assetDyDropPct}
              onChange={(event) => setAssetDyDropPct(event.target.value)}
            />
          </div>
          {message && <p className="text-xs text-emerald-600">{message}</p>}
          <button className="btn btn-primary w-full" type="submit">
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
