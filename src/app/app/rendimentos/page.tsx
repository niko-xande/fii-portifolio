"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { fetchAssets, fetchIncomes, fetchPositions, upsertIncome, deleteIncome } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { LoadingState, ErrorState } from "@/components/State";
import { buildCsv, parseCsv } from "@/utils/csv";
import type { Asset, Income, Position } from "@/types";

const emptyForm = {
  id: "",
  asset_id: "",
  month: "",
  amount: "",
  amount_per_share: ""
};

export default function RendimentosPage() {
  const supabase = getSupabaseBrowser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    setError(null);
    const [{ data: assetsData, error: assetsError }, { data: positionsData, error: positionsError }, { data: incomesData, error: incomesError }] =
      await Promise.all([fetchAssets(supabase), fetchPositions(supabase), fetchIncomes(supabase)]);

    if (assetsError || positionsError || incomesError) {
      setError("Não foi possível carregar os rendimentos.");
    }

    setAssets(assetsData ?? []);
    setPositions(positionsData ?? []);
    setIncomes(incomesData ?? []);
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

  const assetMap = useMemo(() => {
    return assets.reduce<Record<string, Asset>>((acc, asset) => {
      acc[asset.id] = asset;
      return acc;
    }, {});
  }, [assets]);

  const monthIncomes = selectedMonth
    ? incomes.filter((income) => income.month === selectedMonth)
    : incomes;

  const totalMonthIncome = monthIncomes.reduce((sum, income) => sum + Number(income.amount ?? 0), 0);

  const handleEdit = (income?: Income) => {
    if (!income) {
      setForm({ ...emptyForm, month: selectedMonth || new Date().toISOString().slice(0, 7) });
    } else {
      setForm({
        id: income.id,
        asset_id: income.asset_id,
        month: income.month,
        amount: income.amount?.toString() || "",
        amount_per_share: income.amount_per_share?.toString() || ""
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const position = positionMap[form.asset_id];
    let amount = form.amount ? Number(form.amount) : null;
    let amountPerShare = form.amount_per_share ? Number(form.amount_per_share) : null;

    if (!amount && amountPerShare && position?.quantity) {
      amount = amountPerShare * Number(position.quantity);
    }

    const payload = {
      id: form.id || undefined,
      asset_id: form.asset_id,
      month: form.month,
      amount,
      amount_per_share: amountPerShare
    };

    const { error: saveError } = await upsertIncome(supabase, payload);
    if (saveError) {
      setError(saveError.message);
      return;
    }

    setModalOpen(false);
    setForm({ ...emptyForm });
    await load();
  };

  const handleDelete = async (income: Income) => {
    if (!confirm("Excluir lançamento?")) return;
    const { error: deleteError } = await deleteIncome(supabase, income.id);
    if (deleteError) setError(deleteError.message);
    await load();
  };

  const handleExport = () => {
    const rows = monthIncomes.map((income) => ({
      ticker: assetMap[income.asset_id]?.ticker || "",
      month: income.month,
      amount: income.amount ?? "",
      amount_per_share: income.amount_per_share ?? ""
    }));
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rendimentos-${selectedMonth || "todos"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    for (const row of rows) {
      const ticker = row.ticker?.toUpperCase();
      const asset = assets.find((item) => item.ticker === ticker);
      if (!asset) continue;
      await upsertIncome(supabase, {
        asset_id: asset.id,
        month: row.month,
        amount: row.amount ? Number(row.amount) : null,
        amount_per_share: row.amount_per_share ? Number(row.amount_per_share) : null
      });
    }
    await load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Rendimentos</h2>
          <p className="text-sm text-slate-500">Lance os dividendos por mês.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleEdit()}>
          Novo lançamento
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="text-xs font-semibold text-slate-600">Filtrar por mês</label>
          <input
            type="month"
            className="input mt-1"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button className="btn btn-ghost w-full" onClick={handleExport}>
            Exportar CSV
          </button>
        </div>
        <div className="flex items-end">
          <label className="btn btn-ghost w-full cursor-pointer">
            Importar CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-xs text-slate-500">Total do período</p>
            <p className="text-lg font-semibold text-slate-900">{formatCurrency(totalMonthIncome)}</p>
          </div>
        </div>
      </div>

      <ResponsiveTable
        data={monthIncomes}
        emptyLabel="Nenhum rendimento lançado."
        columns={[
          {
            key: "asset",
            label: "Ativo",
            render: (row) => assetMap[row.asset_id]?.ticker || "-"
          },
          { key: "month", label: "Mês" },
          {
            key: "amount",
            label: "Valor",
            render: (row) => formatCurrency(Number(row.amount ?? 0))
          },
          {
            key: "amount_per_share",
            label: "Por cota",
            render: (row) => (row.amount_per_share ? formatCurrency(Number(row.amount_per_share)) : "-")
          },
          {
            key: "actions",
            label: "Ações",
            render: (row) => (
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => handleEdit(row)}>
                  Editar
                </button>
                <button className="btn btn-ghost" onClick={() => handleDelete(row)}>
                  Excluir
                </button>
              </div>
            )
          }
        ]}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Lançar rendimento">
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="text-xs font-semibold text-slate-600">Ativo *</label>
            <select
              className="select mt-1"
              value={form.asset_id}
              onChange={(event) => setForm((prev) => ({ ...prev, asset_id: event.target.value }))}
              required
            >
              <option value="">Selecione</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.ticker}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Mês *</label>
            <input
              type="month"
              className="input mt-1"
              value={form.month}
              onChange={(event) => setForm((prev) => ({ ...prev, month: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Valor total</label>
              <input
                type="number"
                className="input mt-1"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Valor por cota</label>
              <input
                type="number"
                className="input mt-1"
                value={form.amount_per_share}
                onChange={(event) => setForm((prev) => ({ ...prev, amount_per_share: event.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Se informar o valor por cota, o sistema calcula o total baseado na sua posição.
          </p>
          <button className="btn btn-primary w-full" type="submit">
            Salvar
          </button>
        </form>
      </Modal>
    </div>
  );
}
