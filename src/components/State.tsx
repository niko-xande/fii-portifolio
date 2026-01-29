interface StateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: StateProps) {
  return (
    <div className="card">
      <div className="card-body text-center">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

export function ErrorState({ title, description }: StateProps) {
  return (
    <div className="card">
      <div className="card-body text-center">
        <p className="text-sm font-semibold text-rose-600">{title}</p>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return <div className="text-sm text-slate-500">{label}</div>;
}
