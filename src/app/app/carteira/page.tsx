"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { fetchAssets, fetchPositions, upsertAsset, upsertPosition, deleteAsset } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { LoadingState, ErrorState } from "@/components/State";
import type { Asset, Position } from "@/types";

interface AssetWithPosition extends Asset {
  position?: Position | null;
  investedValue: number;
}

const emptyForm = {
  id: "",
  ticker: "",
  name: "",
  type: "tijolo",
  sector: "",
  notes: "",
  quantity: "",
  avg_price: "",
  start_date: "",
  costs: ""
};

export default function CarteiraPage() {
  const supabase = getSupabaseBrowser();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [filters, setFilters] = useState({ ticker: "", sector: "", type: "" });

  const load = async () => {
    setLoading(true);
    setError(null);
    const [{ data: assetsData, error: assetsError }, { data: positionsData, error: positionsError }] =
      await Promise.all([fetchAssets(supabase), fetchPositions(supabase)]);

    if (assetsError || positionsError) {
      setError("Não foi possível carregar a carteira.");
    }

    setAssets(assetsData ?? []);
    setPositions(positionsData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const assetRows = useMemo<AssetWithPosition[]>(() => {
    const positionMap = positions.reduce<Record<string, Position>>((acc, pos) => {
      acc[pos.asset_id] = pos;
      return acc;
    }, {});

    return assets.map((asset) => {
      const pos = positionMap[asset.id];
      const invested = pos
        ? Number(pos.quantity) * Number(pos.avg_price) + Number(pos.costs ?? 0)
        : 0;
      return { ...asset, position: pos, investedValue: invested };
    });
  }, [assets, positions]);

  const filteredRows = assetRows.filter((row) => {
    if (filters.ticker && !row.ticker.toLowerCase().includes(filters.ticker.toLowerCase())) return false;
    if (filters.sector && row.sector !== filters.sector) return false;
    if (filters.type && row.type !== filters.type) return false;
    return true;
  });

  const handleEdit = (row?: AssetWithPosition) => {
    if (!row) {
      setForm({ ...emptyForm });
    } else {
      setForm({
        id: row.id,
        ticker: row.ticker,
        name: row.name || "",
        type: row.type || "tijolo",
        sector: row.sector || "",
        notes: row.notes || "",
        quantity: row.position?.quantity?.toString() || "",
        avg_price: row.position?.avg_price?.toString() || "",
        start_date: row.position?.start_date || "",
        costs: row.position?.costs?.toString() || ""
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    const assetPayload: Partial<Asset> = {
      id: form.id || undefined,
      ticker: form.ticker.toUpperCase(),
      name: form.name || null,
      type: (form.type as Asset["type"]) || null,
      sector: form.sector || null,
      notes: form.notes || null
    };

    const { data: savedAsset, error: assetError } = await upsertAsset(supabase, assetPayload);
    if (assetError || !savedAsset) {
      setError(assetError?.message || "Erro ao salvar ativo.");
      return;
    }

    if (form.quantity && form.avg_price) {
      const positionPayload = {
        asset_id: savedAsset.id,
        quantity: Number(form.quantity),
        avg_price: Number(form.avg_price),
        start_date: form.start_date || null,
        costs: form.costs ? Number(form.costs) : null
      };
      const { error: positionError } = await upsertPosition(supabase, positionPayload);
      if (positionError) {
        setError(positionError.message);
        return;
      }
    }

    setModalOpen(false);
    setForm({ ...emptyForm });
    await load();
  };

  const handleDelete = async (row: AssetWithPosition) => {
    if (!confirm(`Excluir o ativo ${row.ticker}?`)) return;
    const { error: deleteError } = await deleteAsset(supabase, row.id);
    if (deleteError) setError(deleteError.message);
    await load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title={error} />;

  const sectors = Array.from(new Set(assets.map((asset) => asset.sector).filter(Boolean))) as string[];
  const types = Array.from(new Set(assets.map((asset) => asset.type).filter(Boolean))) as string[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Carteira</h2>
          <p className="text-sm text-slate-500">Gerencie seus ativos e posições.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleEdit()}>
          Novo ativo
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          className="input"
          placeholder="Buscar ticker"
          value={filters.ticker}
          onChange={(event) => setFilters((prev) => ({ ...prev, ticker: event.target.value }))}
        />
        <select
          className="select"
          value={filters.type}
          onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
        >
          <option value="">Tipo (todos)</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={filters.sector}
          onChange={(event) => setFilters((prev) => ({ ...prev, sector: event.target.value }))}
        >
          <option value="">Setor (todos)</option>
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveTable
        data={filteredRows}
        columns={[
          { key: "ticker", label: "Ticker" },
          { key: "name", label: "Nome", render: (row) => row.name || "-" },
          { key: "type", label: "Tipo", render: (row) => row.type || "-" },
          { key: "sector", label: "Setor", render: (row) => row.sector || "-" },
          {
            key: "quantity",
            label: "Qtd",
            render: (row) => row.position?.quantity?.toLocaleString("pt-BR") || "-"
          },
          {
            key: "avg_price",
            label: "Preço médio",
            render: (row) => (row.position ? formatCurrency(Number(row.position.avg_price)) : "-")
          },
          {
            key: "investedValue",
            label: "Investido",
            render: (row) => formatCurrency(row.investedValue)
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ativo e posição">
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Ticker *</label>
              <input
                className="input mt-1"
                value={form.ticker}
                onChange={(event) => setForm((prev) => ({ ...prev, ticker: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Nome</label>
              <input
                className="input mt-1"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Tipo</label>
              <select
                className="select mt-1"
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              >
                <option value="tijolo">Tijolo</option>
                <option value="papel">Papel</option>
                <option value="hibrido">Híbrido</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Setor</label>
              <input
                className="input mt-1"
                value={form.sector}
                onChange={(event) => setForm((prev) => ({ ...prev, sector: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Observações</label>
            <textarea
              className="input mt-1"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
            />
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-700">Posição</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Quantidade *</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.quantity}
                  onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Preço médio *</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.avg_price}
                  onChange={(event) => setForm((prev) => ({ ...prev, avg_price: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Data de início</label>
                <input
                  type="date"
                  className="input mt-1"
                  value={form.start_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Custos</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={form.costs}
                  onChange={(event) => setForm((prev) => ({ ...prev, costs: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <button className="btn btn-primary w-full" type="submit">
            Salvar
          </button>
        </form>
      </Modal>
    </div>
  );
}
