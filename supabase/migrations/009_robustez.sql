-- Robustez para escala (1.000+ pessoas): políticas mais rápidas, índices e limite contra abuso nos formulários.
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run. (Depende das migrations 001 a 008.)
-- É seguro rodar de novo: tudo é idempotente. Não muda nenhum comportamento visível para quem usa o site normalmente.
--
-- 1) Políticas RLS: `auth.uid()` e `is_admin()` passam a ser avaliados UMA vez por consulta, não uma vez por linha
--    (recomendação oficial do Supabase para RLS: envolver em `(select ...)`). O significado das regras não muda.
-- 2) Índices em `user_id` (e `criado_em`) das tabelas de envio: sem eles, "dono lê" e os limites abaixo viram varredura completa.
-- 3) Limite de envios nas tabelas abertas a qualquer pessoa (artigos, palestrantes, relatos): impede encher o banco.

-- ---------------------------------------------------------------------------
-- 1) Políticas
-- ---------------------------------------------------------------------------
-- perfis
drop policy if exists "perfil: dono lê" on public.perfis;
drop policy if exists "perfil: dono cria" on public.perfis;
drop policy if exists "perfil: dono altera" on public.perfis;
create policy "perfil: dono lê"     on public.perfis for select using ((select auth.uid()) = id);
create policy "perfil: dono cria"   on public.perfis for insert with check ((select auth.uid()) = id);
create policy "perfil: dono altera" on public.perfis for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- vagas_salvas
drop policy if exists "salvas: dono lê" on public.vagas_salvas;
drop policy if exists "salvas: dono cria" on public.vagas_salvas;
drop policy if exists "salvas: dono remove" on public.vagas_salvas;
create policy "salvas: dono lê"     on public.vagas_salvas for select using ((select auth.uid()) = user_id);
create policy "salvas: dono cria"   on public.vagas_salvas for insert with check ((select auth.uid()) = user_id);
create policy "salvas: dono remove" on public.vagas_salvas for delete using ((select auth.uid()) = user_id);

-- inscricoes_trilha
drop policy if exists "trilha: dono lê" on public.inscricoes_trilha;
drop policy if exists "trilha: dono cria" on public.inscricoes_trilha;
drop policy if exists "trilha: dono altera" on public.inscricoes_trilha;
drop policy if exists "trilha: dono remove" on public.inscricoes_trilha;
create policy "trilha: dono lê"     on public.inscricoes_trilha for select using ((select auth.uid()) = user_id);
create policy "trilha: dono cria"   on public.inscricoes_trilha for insert with check ((select auth.uid()) = user_id);
create policy "trilha: dono altera" on public.inscricoes_trilha for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "trilha: dono remove" on public.inscricoes_trilha for delete using ((select auth.uid()) = user_id);

-- reportes_vaga
drop policy if exists "reportes: qualquer pessoa envia" on public.reportes_vaga;
drop policy if exists "reportes: admin lê" on public.reportes_vaga;
create policy "reportes: qualquer pessoa envia" on public.reportes_vaga
  for insert to anon, authenticated
  with check (user_id is not distinct from (select auth.uid()));
create policy "reportes: admin lê" on public.reportes_vaga
  for select to authenticated
  using ((select public.is_admin()));

-- palestrantes
drop policy if exists "palestrantes: qualquer pessoa envia" on public.palestrantes;
drop policy if exists "palestrantes: admin lê" on public.palestrantes;
drop policy if exists "palestrantes: admin altera" on public.palestrantes;
drop policy if exists "palestrantes: admin remove" on public.palestrantes;
drop policy if exists "palestrantes: dono lê" on public.palestrantes;
create policy "palestrantes: qualquer pessoa envia" on public.palestrantes
  for insert to anon, authenticated
  with check (status = 'pendente' and user_id is not distinct from (select auth.uid()));
create policy "palestrantes: admin lê"     on public.palestrantes for select to authenticated using ((select public.is_admin()));
create policy "palestrantes: admin altera" on public.palestrantes for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "palestrantes: admin remove" on public.palestrantes for delete to authenticated using ((select public.is_admin()));
create policy "palestrantes: dono lê"      on public.palestrantes for select to authenticated using (user_id = (select auth.uid()));

-- submissoes_artigos
drop policy if exists "artigos: qualquer pessoa envia" on public.submissoes_artigos;
drop policy if exists "artigos: admin lê" on public.submissoes_artigos;
drop policy if exists "artigos: admin altera" on public.submissoes_artigos;
drop policy if exists "artigos: admin remove" on public.submissoes_artigos;
drop policy if exists "artigos: dono lê" on public.submissoes_artigos;
create policy "artigos: qualquer pessoa envia" on public.submissoes_artigos
  for insert to anon, authenticated
  with check (status = 'recebido' and user_id is not distinct from (select auth.uid()));
create policy "artigos: admin lê"     on public.submissoes_artigos for select to authenticated using ((select public.is_admin()));
create policy "artigos: admin altera" on public.submissoes_artigos for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "artigos: admin remove" on public.submissoes_artigos for delete to authenticated using ((select public.is_admin()));
create policy "artigos: dono lê"      on public.submissoes_artigos for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) Índices
-- ---------------------------------------------------------------------------
-- (user_id, criado_em desc) atende "dono lê", os limites da seção 3 e a cascata ao excluir uma conta.
create index if not exists submissoes_artigos_user_criado on public.submissoes_artigos (user_id, criado_em desc);
create index if not exists palestrantes_user_criado       on public.palestrantes (user_id, criado_em desc);
create index if not exists reportes_vaga_user_criado      on public.reportes_vaga (user_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- 3) Limite de envios
-- ---------------------------------------------------------------------------
-- Duas camadas, porque quem não está logado não tem identidade no banco (o IP não chega até aqui):
--   * por pessoa logada, numa janela de tempo;
--   * teto global para envios anônimos por hora (protege o banco; o limite por IP fica no proxy, ver docs/escala-1000-usuarios.md).
-- Se o teto anônimo for atingido, quem não está logado precisa tentar mais tarde; quem está logada continua enviando.
-- Os valores são folgados para uso humano normal. Ajuste aqui se a comunidade crescer.
create or replace function public.limitar_envios() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  por_pessoa integer;
  janela_pessoa interval;
  teto_anonimo integer;
  recentes integer;
begin
  case tg_table_name
    when 'submissoes_artigos' then por_pessoa := 5;  janela_pessoa := interval '24 hours'; teto_anonimo := 20;
    when 'palestrantes'       then por_pessoa := 3;  janela_pessoa := interval '24 hours'; teto_anonimo := 20;
    when 'reportes_vaga'      then por_pessoa := 30; janela_pessoa := interval '1 hour';   teto_anonimo := 120;
    else return new;
  end case;

  if new.user_id is not null then
    execute format('select count(*) from public.%I where user_id = $1 and criado_em > now() - $2', tg_table_name)
      into recentes using new.user_id, janela_pessoa;
    if recentes >= por_pessoa then
      raise exception 'limite de envios atingido, tente novamente mais tarde' using errcode = 'P0001';
    end if;
  else
    execute format('select count(*) from public.%I where user_id is null and criado_em > now() - interval ''1 hour''', tg_table_name)
      into recentes;
    if recentes >= teto_anonimo then
      raise exception 'muitos envios no momento, tente novamente mais tarde' using errcode = 'P0001';
    end if;
  end if;

  return new;
end $$;

revoke all on function public.limitar_envios() from public, anon, authenticated;

drop trigger if exists limitar_envios on public.submissoes_artigos;
create trigger limitar_envios before insert on public.submissoes_artigos
  for each row execute function public.limitar_envios();

drop trigger if exists limitar_envios on public.palestrantes;
create trigger limitar_envios before insert on public.palestrantes
  for each row execute function public.limitar_envios();

drop trigger if exists limitar_envios on public.reportes_vaga;
create trigger limitar_envios before insert on public.reportes_vaga
  for each row execute function public.limitar_envios();
