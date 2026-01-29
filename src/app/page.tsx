import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <h1 className="text-xl font-semibold text-slate-900">FII-Portfolio</h1>
        <Link href="/auth" className="btn btn-primary">
          Entrar
        </Link>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <p className="badge badge-success">Controle total dos seus FIIs</p>
          <h2 className="text-4xl font-semibold text-slate-900">
            Acompanhe sua carteira de FIIs com clareza e foco na renda.
          </h2>
          <p className="text-base text-slate-600">
            Registre ativos, posições e rendimentos mensais. Visualize indicadores de saúde,
            concentração e evolução da renda em um painel responsivo.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/auth" className="btn btn-primary">
              Criar conta grátis
            </Link>
            <a href="#recursos" className="btn btn-ghost">
              Ver recursos
            </a>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="card">
            <div className="card-body">
              <p className="text-xs text-slate-500">Patrimônio investido</p>
              <p className="text-3xl font-semibold text-slate-900">R$ 82.450,00</p>
              <p className="text-xs text-emerald-600">+12% no ano</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <p className="text-xs text-slate-500">Renda mensal</p>
              <p className="text-3xl font-semibold text-slate-900">R$ 1.920,00</p>
              <p className="text-xs text-slate-500">Média 6m: R$ 1.780,00</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <p className="text-xs text-slate-500">Concentração</p>
              <p className="text-lg font-semibold text-slate-900">Máx. 18% por ativo</p>
              <p className="text-xs text-slate-500">Alertas inteligentes</p>
            </div>
          </div>
        </div>
      </main>
      <section id="recursos" className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 md:grid-cols-3">
        {["Carteira detalhada", "Rendimentos mensais", "Alertas de saúde"].map((title) => (
          <div key={title} className="card">
            <div className="card-body">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="mt-2 text-xs text-slate-500">
                Organize dados essenciais e acompanhe indicadores com clareza.
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
