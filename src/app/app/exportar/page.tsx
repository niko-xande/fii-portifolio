"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { fetchAssets, fetchPositions, fetchIncomes, upsertAsset, upsertPosition, upsertIncome } from "@/lib/db";
import { LoadingState, ErrorState } from "@/components/State";
import { buildCsv, parseCsv } from "@/utils/csv";
import type { Asset, Income, Position } from "@/types";

export default function ExportarPage() {
  const supabase = getSupabaseBrowser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [{ data: assetsData, error: assetsError }, { data: positionsData, error: positionsError }, { data: incomesData, error: incomesError }] =
      await Promise.all([fetchAssets(supabase), fetchPositions(supabase), fetchIncomes(supabase)]);

    if (assetsError || positionsError || incomesError) {
      setError("Não foi possível carregar os dados.");
    }

    setAssets(assetsData ?? []);
    setPositions(positionsData ?? []);
    setIncomes(incomesData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const downloadCsv = (name: string, rows: Record<string, any>[]) => {
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAll = () => {
    downloadCsv("ativos.csv", assets);
    downloadCsv("posicoes.csv", positions);
    downloadCsv("rendimentos.csv", incomes);
  };

  const importAssets = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    for (const row of rows) {
      await upsertAsset(supabase, {
        ticker: row.ticker?.toUpperCase(),
        name: row.name || null,
        type: row.type || null,
        sector: row.sector || null,
        notes: row.notes || null,
        status: row.status || null
      });
    }
  };

  const importPositions = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    for (const row of rows) {
      const asset = assets.find((item) => item.ticker === row.ticker?.toUpperCase());
      if (!asset) continue;
      await upsertPosition(supabase, {
        asset_id: asset.id,
        quantity: Number(row.quantity),
        avg_price: Number(row.avg_price),
        start_date: row.start_date || null,
        costs: row.costs ? Number(row.costs) : null
      });
    }
  };

  const importIncomes = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    for (const row of rows) {
      const asset = assets.find((item) => item.ticker === row.ticker?.toUpperCase());
      if (!asset) continue;
      await upsertIncome(supabase, {
        asset_id: asset.id,
        month: row.month,
        amount: row.amount ? Number(row.amount) : null,
        amount_per_share: row.amount_per_share ? Number(row.amount_per_share) : null
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>, type: "assets" | "positions" | "incomes") => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    if (type === "assets") await importAssets(file);
    if (type === "positions") await importPositions(file);
    if (type === "incomes") await importIncomes(file);
    await load();
    setMessage("Importação concluída.");
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Exportar & Importar</h2>
        <p className="text-sm text-slate-500">Faça backup dos seus dados em CSV.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="card-body space-y-3">
            <p className="text-sm font-semibold text-slate-900">Exportar tudo</p>
            <button className="btn btn-primary w-full" onClick={exportAll}>
              Baixar CSVs
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body space-y-3">
            <p className="text-sm font-semibold text-slate-900">Importar ativos</p>
            <label className="btn btn-ghost w-full cursor-pointer">
              Selecionar arquivo
              <input type="file" accept=".csv" className="hidden" onChange={(event) => handleImport(event, "assets")} />
            </label>
          </div>
        </div>
        <div className="card">
          <div className="card-body space-y-3">
            <p className="text-sm font-semibold text-slate-900">Importar posições</p>
            <label className="btn btn-ghost w-full cursor-pointer">
              Selecionar arquivo
              <input type="file" accept=".csv" className="hidden" onChange={(event) => handleImport(event, "positions")} />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body space-y-3">
          <p className="text-sm font-semibold text-slate-900">Importar rendimentos</p>
          <label className="btn btn-ghost w-full cursor-pointer">
            Selecionar arquivo
            <input type="file" accept=".csv" className="hidden" onChange={(event) => handleImport(event, "incomes")} />
          </label>
        </div>
      </div>

      {message && <p className="text-xs text-emerald-600">{message}</p>}
    </div>
  );
}
