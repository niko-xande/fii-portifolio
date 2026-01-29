import clsx from "clsx";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  accent?: "default" | "success" | "warning" | "danger";
}

export function KpiCard({ title, value, subtitle, accent = "default" }: KpiCardProps) {
  return (
    <div className="card">
      <div className="card-body">
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        <p
          className={clsx("kpi-value mt-2", {
            "text-slate-900": accent === "default",
            "text-emerald-600": accent === "success",
            "text-amber-600": accent === "warning",
            "text-rose-600": accent === "danger"
          })}
        >
          {value}
        </p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
