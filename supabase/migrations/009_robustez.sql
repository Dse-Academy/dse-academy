-- Robustez para escala (1.000+ pessoas): políticas mais rápidas, índices e limite contra abuso nos formulários.
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run. (Depende das migrations 001 a 008.)
-- É seguro rodar de novo: tudo é idempotente. ATENÇÃO: muda um comportamento: artigos, palestrantes e relatos passam a exigir
-- login. Publique antes o site que pede o login (PR "exigir login nos formulários"), senão quem não estiver logada vê erro ao enviar.
--
-- 1) Políticas RLS: `auth.uid()` e `is_admin()` passam a ser avaliados UMA vez por consulta, não uma vez por linha
--    (recomendação oficial do Supabase para RLS: envolver em `(select ...)`). O significado das regras não muda.
-- 2) Índices em `user_id` (e `criado_em`) das tabelas de envio: sem eles, "dono lê" e os limites abaixo viram varredura completa.
-- 3) Envio só para quem está logada (artigos, palestrantes e relatos) e com limite por pessoa: impede encher o banco.
--    A partir daqui `anon` NÃO insere mais nessas três tabelas; o site pede login antes de mostrar o formulário.

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
drop policy if exists "reportes: pessoa logada envia" on public.reportes_vaga;
drop policy if exists "reportes: admin lê" on public.reportes_vaga;
create policy "reportes: pessoa logada envia" on public.reportes_vaga
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "reportes: admin lê" on public.reportes_vaga
  for select to authenticated
  using ((select public.is_admin()));

-- palestrantes
drop policy if exists "palestrantes: qualquer pessoa envia" on public.palestrantes;
drop policy if exists "palestrantes: pessoa logada envia" on public.palestrantes;
drop policy if exists "palestrantes: admin lê" on public.palestrantes;
drop policy if exists "palestrantes: admin altera" on public.palestrantes;
drop policy if exists "palestrantes: admin remove" on public.palestrantes;
drop policy if exists "palestrantes: dono lê" on public.palestrantes;
create policy "palestrantes: pessoa logada envia" on public.palestrantes
  for insert to authenticated
  with check (status = 'pendente' and user_id = (select auth.uid()));
create policy "palestrantes: admin lê"     on public.palestrantes for select to authenticated using ((select public.is_admin()));
create policy "palestrantes: admin altera" on public.palestrantes for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "palestrantes: admin remove" on public.palestrantes for delete to authenticated using ((select public.is_admin()));
create policy "palestrantes: dono lê"      on public.palestrantes for select to authenticated using (user_id = (select auth.uid()));

-- submissoes_artigos
drop policy if exists "artigos: qualquer pessoa envia" on public.submissoes_artigos;
drop policy if exists "artigos: pessoa logada envia" on public.submissoes_artigos;
drop policy if exists "artigos: admin lê" on public.submissoes_artigos;
drop policy if exists "artigos: admin altera" on public.submissoes_artigos;
drop policy if exists "artigos: admin remove" on public.submissoes_artigos;
drop policy if exists "artigos: dono lê" on public.submissoes_artigos;
create policy "artigos: pessoa logada envia" on public.submissoes_artigos
  for insert to authenticated
  with check (status = 'recebido' and user_id = (select auth.uid()));
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
-- 3) Limite de envios por pessoa
-- ---------------------------------------------------------------------------
-- Só envia quem está logada (as políticas acima já recusam `anon`); aqui cada pessoa tem um teto numa janela de tempo.
-- Os valores são folgados para uso humano normal. Ajuste aqui se a comunidade crescer.
-- Defesa em profundidade: se um envio chegar sem pessoa identificada (política removida por engano), o gatilho também recusa.
create or replace function public.limitar_envios() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  por_pessoa integer;
  janela interval;
  recentes integer;
begin
  case tg_table_name
    when 'submissoes_artigos' then por_pessoa := 5;  janela := interval '24 hours';
    when 'palestrantes'       then por_pessoa := 3;  janela := interval '24 hours';
    when 'reportes_vaga'      then por_pessoa := 30; janela := interval '1 hour';
    else return new;
  end case;

  if new.user_id is null then
    raise exception 'é preciso estar logada para enviar' using errcode = 'P0001';
  end if;

  execute format('select count(*) from public.%I where user_id = $1 and criado_em > now() - $2', tg_table_name)
    into recentes using new.user_id, janela;
  if recentes >= por_pessoa then
    raise exception 'limite de envios atingido, tente novamente mais tarde' using errcode = 'P0001';
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
