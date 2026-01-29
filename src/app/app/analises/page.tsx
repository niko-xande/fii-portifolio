"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { fetchAssets, fetchIncomes, fetchPositions, fetchValuations, upsertAsset, upsertValuation } from "@/lib/db";
import { formatPercent } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { LoadingState, ErrorState } from "@/components/State";
import { groupIncomesByMonth } from "@/utils/calculations";
import type { Asset, Income, Position, Valuation } from "@/types";

const emptyForm = {
  valuation_id: "",
  asset_id: "",
  price: "",
  vp_per_share: "",
  p_vp: "",
  status: "ok",
  notes: "",
  date: ""
};

export default function AnalisesPage() {
  const supabase = getSupabaseBrowser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    setError(null);
    const [{ data: assetsData, error: assetsError }, { data: positionsData, error: positionsError }, { data: incomesData, error: incomesError }, { data: valuationsData, error: valuationsError }] =
      await Promise.all([
        fetchAssets(supabase),
        fetchPositions(supabase),
        fetchIncomes(supabase),
        fetchValuations(supabase)
      ]);

    if (assetsError || positionsError || incomesError || valuationsError) {
      setError("Não foi possível carregar as análises.");
    }

    setAssets(assetsData ?? []);
    setPositions(positionsData ?? []);
    setIncomes(incomesData ?? []);
    setValuations(valuationsData ?? []);
    setLoading(false);
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

  const rows = assets.map((asset) => {
    const pos = positionMap[asset.id];
    const invested = pos ? Number(pos.quantity) * Number(pos.avg_price) + Number(pos.costs ?? 0) : 0;
    const valuation = latestValuationMap[asset.id];
    const incomeMonth = lastMonth ? incomeByAssetMonth[asset.id]?.[lastMonth] || 0 : 0;

    const monthsSorted = incomeByAssetMonth[asset.id] ? Object.keys(incomeByAssetMonth[asset.id]).sort() : [];
    const last12 = monthsSorted.slice(-12);
    const income12m = last12.reduce((sum, month) => sum + (incomeByAssetMonth[asset.id]?.[month] || 0), 0);

    return {
      ...asset,
      invested,
      valuation,
      dyMonthly: invested ? incomeMonth / invested : 0,
      dy12m: invested ? income12m / invested : 0
    };
  });

  const handleEdit = (asset: Asset) => {
    const valuation = latestValuationMap[asset.id];
    setForm({
      valuation_id: valuation?.id || "",
      asset_id: asset.id,
      price: valuation?.price?.toString() || "",
      vp_per_share: valuation?.vp_per_share?.toString() || "",
      p_vp: valuation?.p_vp?.toString() || "",
      status: asset.status || "ok",
      notes: asset.notes || "",
      date: valuation?.date || new Date().toISOString().slice(0, 10)
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

    setModalOpen(false);
    await load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Análises</h2>
        <p className="text-sm text-slate-500">Acompanhe P/VP, DY e sua tese.</p>
      </div>

      <ResponsiveTable
        data={rows}
        emptyLabel="Cadastre ativos para analisar."
        columns={[
          { key: "ticker", label: "Ticker" },
          {
            key: "p_vp",
            label: "P/VP",
            render: (row) => (row.valuation?.p_vp ? row.valuation.p_vp.toFixed(2) : "-")
          },
          {
            key: "dyMonthly",
            label: "DY mensal",
            render: (row) => formatPercent(row.dyMonthly)
          },
          {
            key: "dy12m",
            label: "DY 12m",
            render: (row) => formatPercent(row.dy12m)
          },
          {
            key: "status",
            label: "Status",
            render: (row) => {
              const status = row.status || "ok";
              const badge =
                status === "problema" ? "badge-danger" : status === "atencao" ? "badge-warning" : "badge-success";
              return <span className={`badge ${badge}`}>{status}</span>;
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
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
          <button className="btn btn-primary w-full" type="submit">
            Salvar análise
          </button>
        </form>
      </Modal>
    </div>
  );
}
