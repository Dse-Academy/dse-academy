-- O mínimo do Supabase que as migrations do projeto esperam: papéis, o esquema auth e auth.uid().
-- Roda antes das migrations (veja 10_migrations_e_seed.sh). Só para o ambiente de teste de carga.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
-- O PostgREST conecta como "authenticator" e troca para anon ou authenticated conforme o token (como no Supabase).
create role authenticator login noinherit password 'senha-de-teste';
grant anon, authenticated, service_role to authenticator;

create schema if not exists auth;
create table auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text,
  created_at timestamptz not null default now()
);

-- auth.uid() lê o "sub" do token, que o PostgREST publica nas configurações da sessão (igual ao Supabase).
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')
  )::uuid
$$;

grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Como no Supabase: tudo o que for criado em public já vem com permissão; quem protege é a RLS.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
