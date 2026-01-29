"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseClient";

export default function AuthPage() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.replace("/app/dashboard");
      } else {
        setMessage("Conta criada! Verifique seu email para confirmar o cadastro.");
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    router.replace("/app/dashboard");
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md card">
        <div className="card-body">
          <Link href="/" className="text-sm text-slate-500">← Voltar</Link>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">
            {isSignup ? "Criar conta" : "Entrar"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isSignup ? "Comece a organizar seus FIIs." : "Acesse sua carteira."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <label className="text-xs font-semibold text-slate-600">Nome</label>
                <input
                  className="input mt-1"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-600">Email</label>
              <input
                type="email"
                className="input mt-1"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Senha</label>
              <input
                type="password"
                className="input mt-1"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {message && <p className="text-xs text-amber-600">{message}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Enviando..." : isSignup ? "Cadastrar" : "Entrar"}
            </button>
          </form>

          <button
            onClick={() => setIsSignup((prev) => !prev)}
            className="mt-4 text-sm text-moss"
          >
            {isSignup ? "Já tem conta? Entrar" : "Não tem conta? Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}
