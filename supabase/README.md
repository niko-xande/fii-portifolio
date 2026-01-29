# Supabase setup (FII-Portfolio)

## 1) Criar projeto
- Crie um projeto no Supabase.
- Anote as chaves **Project URL** e **anon key** (Settings > API).

## 2) Rodar migrations
- Abra **SQL Editor** no Supabase.
- Rode o arquivo `supabase/migrations/001_init.sql`.

## 3) Verificar RLS
- Confirme que todas as tabelas estão com **RLS habilitada**.
- Teste com um usuário autenticado: ele deve ver apenas os próprios dados.

## 4) Seed opcional (dev)
- Rode o arquivo `supabase/seed.sql` se quiser dados de exemplo.

## Observações
- Não use a `service_role key` no frontend.
- Todo acesso deve ocorrer via **anon key** + **RLS**.
