// Valida as migrations do Supabase num Postgres embutido (PGlite), sem Supabase e sem internet.
// Uso (numa pasta qualquer com o pacote instalado):
//   npm i @electric-sql/pglite   e depois   node tests/banco/validar-migrations.mjs <raiz-do-repositorio>
// Roda 001 a 009 em ordem, roda a 009 de novo (idempotência) e confere RLS, limites de envio e índices.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const raiz = process.argv[2];
const db = new PGlite();

await db.exec(`
  create schema if not exists auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz not null default now());
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  -- auth.uid() lê o "usuário atual" de um parâmetro de sessão, como o Supabase faz com o JWT
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);

const arquivos = readdirSync(`${raiz}/supabase/migrations`).filter((f) => f.endsWith(".sql")).sort();
for (const f of arquivos) {
  try {
    await db.exec(readFileSync(`${raiz}/supabase/migrations/${f}`, "utf8"));
    console.log("ok   ", f);
  } catch (e) {
    console.log("ERRO ", f, "->", e.message);
    process.exit(1);
  }
}
// roda a 009 de novo: precisa ser idempotente
await db.exec(readFileSync(`${raiz}/supabase/migrations/009_robustez.sql`, "utf8"));
console.log("ok    009 de novo (idempotente)");

const como = async (papel, uid, fn) => {
  await db.exec(`set role ${papel}; select set_config('app.uid', '${uid ?? ""}', false);`);
  try { return await fn(); } finally { await db.exec("reset role"); }
};
const tenta = async (rotulo, fn) => { try { await fn(); return `${rotulo}: aceito`; } catch (e) { return `${rotulo}: RECUSADO (${e.message.slice(0, 60)})`; } };

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";
const C = "33333333-3333-3333-3333-333333333333"; // pessoa sem nenhum envio: o limite não interfere, quem recusa é a RLS
await db.exec(`insert into auth.users (id, email) values ('${A}','a@x.com'), ('${B}','b@x.com'), ('${C}','c@x.com');`);

const artigo = (n, uid = "") => `insert into public.submissoes_artigos (nome,email,bio,titulo,resumo,tags,link_rascunho,aceite_lgpd,aceite_direitos${uid ? ",user_id" : ""})
  values ('Ana','a@x.com','bio de teste com mais de vinte caracteres','Titulo ${n}','resumo de teste com mais de vinte caracteres','{x}','https://x.com/${n}',true,true${uid ? `,'${uid}'` : ""})`;

// 1) limite por pessoa: 5 artigos em 24h
let saidas = [];
for (let i = 1; i <= 6; i++) saidas.push(await como("authenticated", A, () => tenta(`artigo ${i} da pessoa A`, () => db.exec(artigo(i, A)))));
console.log(saidas.join("\n"));

// 2) outra pessoa não é afetada pelo limite da A
console.log(await como("authenticated", B, () => tenta("artigo 1 da pessoa B", () => db.exec(artigo(100, B)))));

// 3) RLS continua valendo: A não vê o artigo de B; B vê só o dela
const vistoPorA = await como("authenticated", A, async () => (await db.query("select count(*)::int n from public.submissoes_artigos")).rows[0].n);
const vistoPorB = await como("authenticated", B, async () => (await db.query("select count(*)::int n from public.submissoes_artigos")).rows[0].n);
console.log(`A enxerga ${vistoPorA} artigo(s) (esperado 5); B enxerga ${vistoPorB} (esperado 1)`);

// 4) anônimo não envia nada (artigo, palestrante e relato) nem lê
const palestrante = (uid) => `insert into public.palestrantes (nome,email,bio,temas,formatos,modalidade,aceite_lgpd${uid ? ",user_id" : ""})
  values ('Bia','b@x.com','bio de teste com mais de vinte caracteres','{x}','{palestra}','remoto',true${uid ? `,'${uid}'` : ""})`;
const relato = (uid) => `insert into public.reportes_vaga (vaga_id,tipo${uid ? ",user_id" : ""}) values ('v1','outro'${uid ? `,'${uid}'` : ""})`;
console.log(await como("anon", "", () => tenta("anônimo envia artigo", () => db.exec(artigo(201)))));
console.log(await como("anon", "", () => tenta("anônimo envia cadastro de palestrante", () => db.exec(palestrante()))));
console.log(await como("anon", "", () => tenta("anônimo envia relato de vaga", () => db.exec(relato()))));
console.log(await como("anon", "", () => tenta("anônimo grava em nome da pessoa C (recusa pela RLS)", () => db.exec(artigo(202, C)))));
const anonLe = await como("anon", "", async () => (await db.query("select count(*)::int n from public.submissoes_artigos")).rows[0].n);
console.log(`anônimo enxerga ${anonLe} artigo(s) (esperado 0)`);

// 5) pessoa logada: não pode enviar em nome de outra, e os três formulários funcionam para ela
console.log(await como("authenticated", B, () => tenta("pessoa B grava artigo em nome da pessoa C (recusa pela RLS)", () => db.exec(artigo(300, C)))));
console.log(await como("authenticated", B, () => tenta("pessoa B grava palestrante em nome da pessoa C (recusa pela RLS)", () => db.exec(palestrante(C)))));
console.log(await como("authenticated", B, () => tenta("pessoa B grava relato em nome da pessoa C (recusa pela RLS)", () => db.exec(relato(C)))));
console.log(await como("authenticated", B, () => tenta("pessoa B envia palestrante em seu nome", () => db.exec(palestrante(B)))));
console.log(await como("authenticated", B, () => tenta("pessoa B envia relato em seu nome", () => db.exec(relato(B)))));
// limite de relatos: 30 por hora
let recusouRelato = null;
for (let i = 1; i <= 35; i++) {
  try { await como("authenticated", A, () => db.exec(relato(A))); } catch { recusouRelato = i; break; }
}
console.log(`relatos da pessoa A: recusou a partir do nº ${recusouRelato} (esperado 31)`);

// 5b) versão da política aceita (migration 010): data válida entra; formato inválido é recusado; omitir continua funcionando
const comVersao = (n, versao) => `insert into public.submissoes_artigos (nome,email,bio,titulo,resumo,tags,link_rascunho,aceite_lgpd,aceite_direitos,user_id,versao_politica)
  values ('Ana','a@x.com','bio de teste com mais de vinte caracteres','Titulo ${n}','resumo de teste com mais de vinte caracteres','{x}','https://x.com/${n}',true,true,'${C}',${versao === null ? "null" : `'${versao}'`})`;
console.log(await como("authenticated", C, () => tenta("artigo com versão 2026-10-17", () => db.exec(comVersao(900, "2026-10-17")))));
console.log(await como("authenticated", C, () => tenta("artigo com versão fora do formato (hoje)", () => db.exec(comVersao(901, "hoje")))));
console.log(await como("authenticated", C, () => tenta("artigo sem versão (aceite anterior ao registro)", () => db.exec(comVersao(902, null)))));
const salvas = (await db.query("select versao_politica from public.submissoes_artigos where titulo = 'Titulo 900'")).rows[0];
console.log("versão gravada no artigo 900:", salvas?.versao_politica, "(esperado 2026-10-17)");
const pal = (versao) => `insert into public.palestrantes (nome,email,bio,temas,formatos,modalidade,aceite_lgpd,user_id,versao_politica)
  values ('Bia','b@x.com','bio de teste com mais de vinte caracteres','{x}','{palestra}','remoto',true,'${C}','${versao}')`;
console.log(await como("authenticated", C, () => tenta("palestrante com versão 2026-10-17", () => db.exec(pal("2026-10-17")))));
console.log(await como("authenticated", C, () => tenta("palestrante com versão inválida", () => db.exec(pal("17/10/2026")))));

// 6) índices e funções existem
const idx = (await db.query(`select indexname from pg_indexes where schemaname='public' and indexname like '%user_criado' order by 1`)).rows.map((r) => r.indexname);
console.log("índices:", idx.join(", "));
const pol = (await db.query(`select count(*)::int n from pg_policies where schemaname='public' and (qual like '%SELECT auth.uid()%' or with_check like '%SELECT auth.uid()%' or qual like '%SELECT is_admin()%' or qual like '%SELECT public.is_admin()%')`)).rows[0].n;
console.log("políticas com (select auth.uid()/is_admin()):", pol);
