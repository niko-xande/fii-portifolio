"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import clsx from "clsx";

const navItems = [
  { href: "/app/dashboard", label: "Saúde" },
  { href: "/app/carteira", label: "Carteira" },
  { href: "/app/rendimentos", label: "Rendimentos" },
  { href: "/app/analises", label: "Análises" },
  { href: "/app/configuracoes", label: "Configurações" },
  { href: "/app/exportar", label: "Exportar" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut, user } = useAuth();
  const [open, setOpen] = useState(false);
  const normalize = (path: string) => path.replace(/\/$/, "");

  return (
    <div className="min-h-screen bg-sand">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden btn btn-ghost"
              onClick={() => setOpen((prev) => !prev)}
              aria-label="Abrir menu"
            >
              ☰
            </button>
            <Link href="/app/dashboard" className="text-lg font-semibold text-slate-900">
              FII-Portfolio
            </Link>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "text-sm font-medium",
                  normalize(pathname) === normalize(item.href)
                    ? "text-moss"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 md:inline">{user?.email}</span>
            <button className="btn btn-ghost" onClick={signOut}>
              Sair
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-slate-100 bg-white">
            <div className="flex flex-col px-4 py-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "py-2 text-sm",
                    normalize(pathname) === normalize(item.href) ? "text-moss" : "text-slate-700"
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 fade-in">{children}</main>
    </div>
  );
}
