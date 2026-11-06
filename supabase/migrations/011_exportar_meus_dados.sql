-- Exportar meus dados (portabilidade, LGPD art. 18): devolve num JSON tudo o que o portal guarda da PESSOA LOGADA.
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run. (Depende das migrations 001 a 009.) É seguro rodar de novo.
--
-- A função só enxerga auth.uid(): não recebe parâmetro, então não há como pedir os dados de outra pessoa. É `security definer`
-- porque a pessoa não pode ler os próprios relatos de erro pela RLS (só a administração lê), mas eles são dela e entram na exportação.
-- O `user_id` sai de cada linha (é a própria pessoa) e nada de outra pessoa entra: todas as consultas filtram por auth.uid().

create or replace function public.exportar_meus_dados() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
begin
  if eu is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'exportado_em', now(),
    'conta', (select jsonb_build_object('id', u.id, 'email', u.email, 'criada_em', u.created_at) from auth.users u where u.id = eu),
    'perfil', (select to_jsonb(p) - 'id' from public.perfis p where p.id = eu),
    'vagas_salvas', coalesce((select jsonb_agg(to_jsonb(v) - 'user_id' order by v.salva_em desc) from public.vagas_salvas v where v.user_id = eu), '[]'::jsonb),
    'trilhas', coalesce((select jsonb_agg(to_jsonb(i) - 'user_id' order by i.criado_em) from public.inscricoes_trilha i where i.user_id = eu), '[]'::jsonb),
    'artigos_enviados', coalesce((select jsonb_agg(to_jsonb(a) - 'user_id' order by a.criado_em) from public.submissoes_artigos a where a.user_id = eu), '[]'::jsonb),
    'cadastros_de_palestrante', coalesce((select jsonb_agg(to_jsonb(p) - 'user_id' order by p.criado_em) from public.palestrantes p where p.user_id = eu), '[]'::jsonb),
    'relatos_de_vaga', coalesce((select jsonb_agg(to_jsonb(r) - 'user_id' order by r.criado_em) from public.reportes_vaga r where r.user_id = eu), '[]'::jsonb)
  );
end $$;

revoke all on function public.exportar_meus_dados() from public, anon;
grant execute on function public.exportar_meus_dados() to authenticated;
