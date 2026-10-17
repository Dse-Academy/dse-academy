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
await db.exec(`insert into auth.users (id, email) values ('${A}','a@x.com'), ('${B}','b@x.com');`);

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

// 4) anônimo: não consegue atribuir o envio a outra pessoa, nem ler
console.log(await como("anon", "", () => tenta("anônimo grava como se fosse a pessoa A", () => db.exec(artigo(200, A)))));
console.log(await como("anon", "", () => tenta("anônimo envia artigo anônimo", () => db.exec(artigo(201)))));
const anonLe = await como("anon", "", async () => (await db.query("select count(*)::int n from public.submissoes_artigos")).rows[0].n);
console.log(`anônimo enxerga ${anonLe} artigo(s) (esperado 0)`);

// 5) teto global anônimo (20/h): preenche e testa a recusa
let recusou = null;
for (let i = 300; i < 330; i++) {
  try { await como("anon", "", () => db.exec(artigo(i))); } catch (e) { recusou = i; break; }
}
console.log(`teto anônimo: recusou a partir do envio nº ${recusou - 300 + 1 + 1} (esperado perto de 20, contando o anônimo anterior)`);
// quem está logada continua podendo enviar (pessoa B ainda tem limite)
console.log(await como("authenticated", B, () => tenta("pessoa B envia durante o teto anônimo", () => db.exec(artigo(400, B)))));

// 6) índices e funções existem
const idx = (await db.query(`select indexname from pg_indexes where schemaname='public' and indexname like '%user_criado' order by 1`)).rows.map((r) => r.indexname);
console.log("índices:", idx.join(", "));
const pol = (await db.query(`select count(*)::int n from pg_policies where schemaname='public' and (qual like '%SELECT auth.uid()%' or with_check like '%SELECT auth.uid()%' or qual like '%SELECT is_admin()%' or qual like '%SELECT public.is_admin()%')`)).rows[0].n;
console.log("políticas com (select auth.uid()/is_admin()):", pol);
