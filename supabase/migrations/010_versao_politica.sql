-- Registra a versão da Política de Privacidade aceita em cada envio de formulário (requisito PRIV-03).
--
-- Rode no Supabase: Dashboard > SQL Editor > cole este arquivo > Run. (Depende da 004 e da 005.)
-- É seguro rodar de novo. ORDEM DE PUBLICAÇÃO: rode esta migration ANTES de o site novo ir ao ar. O site novo envia a coluna
-- `versao_politica`; sem a coluna no banco, o envio dos formulários falha. (O contrário é seguro: com a coluna criada,
-- o site antigo continua enviando sem ela e a coluna fica nula.)
--
-- A versão é uma data AAAA-MM-DD (a mesma de `VERSAO_POLITICA` em apps/web/src/lib/privacidade.ts), a data em que o texto
-- da política passou a valer. Serve para provar a qual texto a pessoa deu o aceite. Linhas anteriores a esta migration
-- ficam com a coluna nula (aceite dado antes do registro de versão).

alter table public.submissoes_artigos
  add column if not exists versao_politica text
  check (versao_politica is null or versao_politica ~ '^\d{4}-\d{2}-\d{2}$');

alter table public.palestrantes
  add column if not exists versao_politica text
  check (versao_politica is null or versao_politica ~ '^\d{4}-\d{2}-\d{2}$');

comment on column public.submissoes_artigos.versao_politica is 'Versão (AAAA-MM-DD) da Política de Privacidade aceita no envio; nula = anterior ao registro de versão.';
comment on column public.palestrantes.versao_politica is 'Versão (AAAA-MM-DD) da Política de Privacidade aceita no cadastro; nula = anterior ao registro de versão.';
