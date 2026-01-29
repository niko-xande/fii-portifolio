import React from "react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyLabel?: string;
}

export function ResponsiveTable<T extends { id?: string | number }>({
  columns,
  data,
  emptyLabel = "Nenhum registro encontrado"
}: ResponsiveTableProps<T>) {
  if (!data.length) {
    return <div className="text-sm text-slate-500">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block table-responsive">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} className="text-left text-xs font-semibold text-slate-500">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.id ? String(row.id) : idx} className="bg-white shadow-sm">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-3 py-3 text-sm text-slate-700">
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {data.map((row, idx) => (
          <div key={row.id ? String(row.id) : idx} className="card">
            <div className="card-body space-y-2">
              {columns.map((col) => (
                <div key={String(col.key)} className="flex items-start justify-between text-sm">
                  <span className="text-slate-500">{col.label}</span>
                  <span className="text-slate-800 text-right">
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
