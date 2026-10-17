-- Dados de teste para :usuarios pessoas (padrão 1000). Tudo fictício.
-- Os ids são md5('u'||i)::uuid: o k6 calcula os mesmos ids, então cada usuário virtual "é" uma pessoa deste arquivo.
-- A pessoa 0 existe só para o teste de abuso (nunca tem envios antigos).

insert into auth.users (id, email, created_at)
select md5('u' || i)::uuid, 'u' || i || '@teste.local', now() - (i || ' minutes')::interval
from generate_series(0, :usuarios) as i;

insert into public.perfis (id, nome, habilidades, area, senioridade)
select md5('u' || i)::uuid,
       'Pessoa ' || i,
       array['sql', 'python', 'power bi'],
       (array['analise_dados', 'engenharia_dados', 'bi', 'ciencia_dados'])[1 + i % 4],
       (array['entrada', 'junior', 'pleno', 'senior'])[1 + i % 4]
from generate_series(1, :usuarios) as i;

-- 15 vagas salvas por pessoa (o limite do projeto é 500; 15 é um uso realista)
insert into public.vagas_salvas (user_id, vaga_id, titulo, empresa, url)
select md5('u' || u)::uuid, 'gupy:' || (1 + ((u * 7 + k) % 500)), 'Vaga ' || k, 'Empresa ' || k, 'https://exemplo.com/vaga/' || k
from generate_series(1, :usuarios) as u, generate_series(1, 15) as k;

-- 2 trilhas por pessoa, com algum progresso
insert into public.inscricoes_trilha (user_id, trilha_id, concluidas)
select md5('u' || u)::uuid, t.id, array['sql', 'python']
from generate_series(1, :usuarios) as u,
     (values ('engenharia_dados'), ('analise_dados')) as t(id);

-- Envios antigos (criado_em no passado, para não contarem nos limites de "últimas horas")
insert into public.submissoes_artigos (nome, email, bio, titulo, resumo, tags, link_rascunho, aceite_lgpd, aceite_direitos, user_id, criado_em)
select 'Pessoa ' || i, 'u' || i || '@teste.local', 'Mini bio de teste com mais de vinte caracteres.', 'Artigo de teste ' || i,
       'Resumo de teste com mais de vinte caracteres, só para volume.', array['dados'], 'https://docs.google.com/document/d/' || i,
       true, true, md5('u' || i)::uuid, now() - interval '30 days'
from generate_series(1, least(:usuarios, 150)) as i;

insert into public.palestrantes (nome, email, bio, temas, formatos, modalidade, aceite_lgpd, user_id, criado_em)
select 'Pessoa ' || i, 'u' || i || '@teste.local', 'Mini bio de teste com mais de vinte caracteres.', array['dados'], array['palestra'], 'remoto',
       true, md5('u' || i)::uuid, now() - interval '30 days'
from generate_series(1, least(:usuarios, 80)) as i;

insert into public.reportes_vaga (vaga_id, titulo, empresa, tipo, user_id, criado_em)
select 'gupy:' || (1 + i % 500), 'Vaga ' || i, 'Empresa', 'outro', md5('u' || (1 + i % :usuarios))::uuid, now() - interval '20 days'
from generate_series(1, 400) as i;

analyze;

-- Marcador de "seed terminado" para o healthcheck (esquema fora de public: o PostgREST não o expõe).
create schema carga;
create table carga.pronto (ok boolean);
insert into carga.pronto values (true);
