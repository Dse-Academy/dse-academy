// Testes das regras de acesso (RLS) e dos limites do banco (requisito SEG-07).
// Aplicam TODAS as migrations de supabase/migrations num Postgres embutido (PGlite) e fingem ser cada pessoa, como o Supabase faz
// com o JWT. Falham o CI se alguém passar a ler ou alterar dado de outra pessoa, se um envio anônimo for aceito, se um limite sumir
// ou se uma tabela nova ficar sem RLS.
//
// Rodar: cd tests/banco && npm ci && npm test
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PASTA = join(RAIZ, "supabase", "migrations");
const db = new PGlite();

/** UUID fixo por número, para os personagens dos testes. */
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const [ANA, BIA, CAIO, ADMIN, DANI, ELI, FABI, GABI, HUGO, IVO] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(id);

/** Executa `fn` com o papel e a pessoa informados (anon = sem pessoa). Sempre volta ao papel de administrador do banco. */
async function como(papel, uid, fn) {
  await db.exec(`set role ${papel}; select set_config('app.uid', '${uid ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
const ana = (fn) => como("authenticated", ANA, fn);
const anonimo = (fn) => como("anon", "", fn);
const admin = (fn) => como("authenticated", ADMIN, fn);

const contar = async (tabela, onde = "true") => (await db.query(`select count(*)::int n from public.${tabela} where ${onde}`)).rows[0].n;
const recusa = (promessa, trecho) => assert.rejects(promessa, (e) => (trecho ? new RegExp(trecho, "i").test(e.message) : true));

const artigo = (n, uid) => `insert into public.submissoes_artigos (nome,email,bio,titulo,resumo,tags,link_rascunho,aceite_lgpd,aceite_direitos${uid ? ",user_id" : ""})
  values ('Ana','a@x.com','bio de teste com mais de vinte caracteres','Titulo ${n}','resumo de teste com mais de vinte caracteres','{x}','https://x.com/${n}',true,true${uid ? `,'${uid}'` : ""})`;
const palestrante = (uid, extra = "") => `insert into public.palestrantes (nome,email,bio,temas,formatos,modalidade,aceite_lgpd${uid ? ",user_id" : ""}${extra ? ",aceite_publicacao" : ""})
  values ('Bia','b@x.com','bio de teste com mais de vinte caracteres','{x}','{palestra}','remoto',true${uid ? `,'${uid}'` : ""}${extra ? ",true" : ""})`;
const relato = (uid) => `insert into public.reportes_vaga (vaga_id,tipo${uid ? ",user_id" : ""}) values ('v1','outro'${uid ? `,'${uid}'` : ""})`;

before(async () => {
  await db.exec(`
    create schema if not exists auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz not null default now());
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    -- auth.uid() lê a "pessoa atual" de um parâmetro de sessão, como o Supabase faz com o JWT
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
  `);
  for (const f of readdirSync(PASTA).filter((n) => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(PASTA, f), "utf8"));
  }
  for (const [n, u] of [ANA, BIA, CAIO, ADMIN, DANI, ELI, FABI, GABI, HUGO, IVO].entries()) {
    await db.exec(`insert into auth.users (id, email) values ('${u}', 'p${n}@x.com')`);
  }
  await db.exec(`insert into public.admins (user_id) values ('${ADMIN}')`);
});

describe("migrations", () => {
  test("a 009 pode ser aplicada de novo sem erro (idempotência)", async () => {
    await db.exec(readFileSync(join(PASTA, "009_robustez.sql"), "utf8"));
  });

  test("toda tabela do esquema public tem RLS ligada (tabela nova sem RLS reprova o CI)", async () => {
    const sem = (await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity order by 1`)).rows.map((r) => r.relname);
    assert.deepEqual(sem, [], `tabelas sem RLS: ${sem.join(", ")}`);
  });

  test("os índices de desempenho existem (DESEMP-01)", async () => {
    const idx = (await db.query(`select indexname from pg_indexes where schemaname='public' and indexname like '%user_criado'`)).rows;
    assert.ok(idx.length >= 3, `índices encontrados: ${idx.map((r) => r.indexname).join(", ")}`);
  });
});

describe("perfis", () => {
  test("a pessoa cria e lê o próprio perfil; outra pessoa não vê, não altera e não cria no nome dela", async () => {
    await ana(() => db.exec(`insert into public.perfis (id, nome, area) values ('${ANA}', 'Ana', 'engenharia')`));
    assert.equal(await ana(() => contar("perfis")), 1);
    assert.equal(await como("authenticated", BIA, () => contar("perfis")), 0, "Bia não pode ver o perfil da Ana");
    const alterou = await como("authenticated", BIA, () => db.query(`update public.perfis set nome = 'hackeado' where id = '${ANA}'`));
    assert.equal(alterou.affectedRows, 0, "Bia não pode alterar o perfil da Ana");
    await como("authenticated", BIA, () => recusa(db.exec(`insert into public.perfis (id, nome) values ('${ANA}', 'falso')`)));
    await como("authenticated", BIA, () => recusa(db.exec(`insert into public.perfis (id, nome) values ('${CAIO}', 'em nome do Caio')`)));
    assert.equal((await db.query(`select nome from public.perfis where id = '${ANA}'`)).rows[0].nome, "Ana");
  });

  test("anônimo não lê nem cria perfil", async () => {
    assert.equal(await anonimo(() => contar("perfis")), 0);
    await anonimo(() => recusa(db.exec(`insert into public.perfis (id) values ('${DANI}')`)));
  });
});

describe("vagas salvas", () => {
  test("cada pessoa vê e remove só as suas", async () => {
    await ana(() => db.exec(`insert into public.vagas_salvas (vaga_id, titulo) values ('gupy:1', 'Vaga da Ana')`));
    await como("authenticated", BIA, () => db.exec(`insert into public.vagas_salvas (vaga_id, titulo) values ('gupy:1', 'Vaga da Bia')`));
    assert.equal(await ana(() => contar("vagas_salvas")), 1);
    assert.equal(await como("authenticated", BIA, () => contar("vagas_salvas", "titulo = 'Vaga da Ana'")), 0);
    const removeu = await como("authenticated", BIA, () => db.query(`delete from public.vagas_salvas where user_id = '${ANA}'`));
    assert.equal(removeu.affectedRows, 0, "Bia não pode remover vaga salva da Ana");
    assert.equal(await contar("vagas_salvas", `user_id = '${ANA}'`), 1);
  });

  test("não dá para salvar vaga em nome de outra pessoa; anônimo não lê nem salva", async () => {
    await como("authenticated", BIA, () => recusa(db.exec(`insert into public.vagas_salvas (user_id, vaga_id) values ('${ANA}', 'gupy:2')`)));
    assert.equal(await anonimo(() => contar("vagas_salvas")), 0);
    await anonimo(() => recusa(db.exec(`insert into public.vagas_salvas (user_id, vaga_id) values ('${ANA}', 'gupy:3')`)));
    await anonimo(() => recusa(db.exec(`insert into public.vagas_salvas (vaga_id) values ('gupy:3')`)));
  });

  test("limite de 500 vagas salvas por pessoa", async () => {
    await db.exec(`insert into public.vagas_salvas (user_id, vaga_id) select '${CAIO}', 'v' || g from generate_series(1, 500) g`);
    await como("authenticated", CAIO, () => recusa(db.exec(`insert into public.vagas_salvas (vaga_id) values ('v501')`), "limite"));
  });
});

describe("inscrições em trilhas", () => {
  test("cada pessoa vê e altera só as suas", async () => {
    await ana(() => db.exec(`insert into public.inscricoes_trilha (trilha_id, concluidas) values ('engenharia_dados', '{sql}')`));
    assert.equal(await como("authenticated", BIA, () => contar("inscricoes_trilha")), 0);
    const alterou = await como("authenticated", BIA, () => db.query(`update public.inscricoes_trilha set concluidas = '{tudo}' where user_id = '${ANA}'`));
    assert.equal(alterou.affectedRows, 0);
    await como("authenticated", BIA, () => recusa(db.exec(`insert into public.inscricoes_trilha (user_id, trilha_id) values ('${ANA}', 'outra')`)));
    assert.equal(await anonimo(() => contar("inscricoes_trilha")), 0);
    await anonimo(() => recusa(db.exec(`insert into public.inscricoes_trilha (user_id, trilha_id) values ('${ANA}', 'x')`)));
  });

  test("limite de 20 trilhas por pessoa", async () => {
    await db.exec(`insert into public.inscricoes_trilha (user_id, trilha_id) select '${DANI}', 't' || g from generate_series(1, 20) g`);
    await como("authenticated", DANI, () => recusa(db.exec(`insert into public.inscricoes_trilha (trilha_id) values ('t21')`), "limite"));
  });
});

describe("artigos enviados", () => {
  test("anônimo não envia nem lê; ninguém envia em nome de outra pessoa", async () => {
    await anonimo(() => recusa(db.exec(artigo(1))));
    await anonimo(() => recusa(db.exec(artigo(2, ANA))));
    await como("authenticated", BIA, () => recusa(db.exec(artigo(3, ANA))));
    assert.equal(await anonimo(() => contar("submissoes_artigos")), 0);
  });

  test("a autora lê só os seus; outra pessoa não vê; só a administração altera o andamento", async () => {
    await ana(() => db.exec(artigo(10, ANA)));
    assert.equal(await ana(() => contar("submissoes_artigos")), 1);
    assert.equal(await como("authenticated", BIA, () => contar("submissoes_artigos")), 0);
    const dona = await ana(() => db.query(`update public.submissoes_artigos set status = 'aprovado' where user_id = '${ANA}'`));
    assert.equal(dona.affectedRows, 0, "quem envia não pode aprovar o próprio artigo");
    assert.ok((await admin(() => contar("submissoes_artigos"))) >= 1, "a administração lê todos");
    const adm = await admin(() => db.query(`update public.submissoes_artigos set status = 'em_revisao' where user_id = '${ANA}'`));
    assert.equal(adm.affectedRows, 1);
  });

  test("artigo nasce 'recebido' (não dá para já enviar aprovado)", async () => {
    await como("authenticated", ELI, () => recusa(db.exec(artigo(20, ELI).replace("aceite_direitos", "aceite_direitos, status").replace("true,true", "true,true,'aprovado'"))));
  });

  test("limite de 5 artigos em 24 horas por pessoa", async () => {
    for (let i = 1; i <= 5; i++) await como("authenticated", FABI, () => db.exec(artigo(100 + i, FABI)));
    await como("authenticated", FABI, () => recusa(db.exec(artigo(106, FABI)), "limite"));
    await como("authenticated", GABI, () => db.exec(artigo(200, GABI))); // o limite é por pessoa
  });
});

describe("palestrantes", () => {
  test("anônimo não cadastra nem lê a tabela; ninguém cadastra em nome de outra pessoa", async () => {
    await anonimo(() => recusa(db.exec(palestrante())));
    await como("authenticated", BIA, () => recusa(db.exec(palestrante(ANA))));
    assert.equal(await anonimo(() => contar("palestrantes")), 0);
  });

  test("a pessoa lê só o próprio cadastro; só a administração aprova", async () => {
    await como("authenticated", BIA, () => db.exec(palestrante(BIA, "publico")));
    assert.equal(await como("authenticated", BIA, () => contar("palestrantes")), 1);
    assert.equal(await ana(() => contar("palestrantes")), 0);
    const propria = await como("authenticated", BIA, () => db.query(`update public.palestrantes set status = 'aprovado' where user_id = '${BIA}'`));
    assert.equal(propria.affectedRows, 0);
  });

  test("a vitrine pública mostra só aprovados que autorizaram, e nunca o e-mail", async () => {
    assert.equal(await anonimo(async () => (await db.query("select count(*)::int n from public.palestrantes_publicos")).rows[0].n), 0, "pendente não aparece");
    await admin(() => db.exec(`update public.palestrantes set status = 'aprovado' where user_id = '${BIA}'`));
    const vitrine = await anonimo(() => db.query("select * from public.palestrantes_publicos"));
    assert.equal(vitrine.rows.length, 1);
    assert.ok(!("email" in vitrine.rows[0]), "o e-mail não pode sair na vitrine");
    assert.ok(!("user_id" in vitrine.rows[0]), "o id da conta não pode sair na vitrine");
  });

  test("limite de 3 cadastros em 24 horas por pessoa", async () => {
    for (let i = 0; i < 3; i++) await como("authenticated", HUGO, () => db.exec(palestrante(HUGO)));
    await como("authenticated", HUGO, () => recusa(db.exec(palestrante(HUGO)), "limite"));
  });
});

describe("relatos de erro em vagas", () => {
  test("anônimo não envia; ninguém envia em nome de outra pessoa; pessoa logada envia", async () => {
    await anonimo(() => recusa(db.exec(relato())));
    await como("authenticated", BIA, () => recusa(db.exec(relato(ANA))));
    await ana(() => db.exec(relato(ANA)));
  });

  test("só a administração lê os relatos", async () => {
    assert.equal(await ana(() => contar("reportes_vaga")), 0, "nem a autora lê o que enviou");
    assert.equal(await anonimo(() => contar("reportes_vaga")), 0);
    assert.ok((await admin(() => contar("reportes_vaga"))) >= 1);
  });

  test("limite de 30 relatos por hora por pessoa", async () => {
    for (let i = 0; i < 30; i++) await como("authenticated", IVO, () => db.exec(relato(IVO)));
    await como("authenticated", IVO, () => recusa(db.exec(relato(IVO)), "limite"));
  });
});

describe("funções de administração", () => {
  test("is_admin: verdadeiro só para quem está na tabela de admins; anônimo não executa", async () => {
    assert.equal((await ana(() => db.query("select public.is_admin() v"))).rows[0].v, false);
    assert.equal((await admin(() => db.query("select public.is_admin() v"))).rows[0].v, true);
    await anonimo(() => recusa(db.query("select public.is_admin()")));
  });

  test("admin_resumo e admin_historico recusam quem não é admin", async () => {
    await ana(() => recusa(db.query("select public.admin_resumo()"), "sem permiss"));
    await ana(() => recusa(db.query("select public.admin_historico(30)"), "sem permiss"));
    await anonimo(() => recusa(db.query("select public.admin_resumo()")));
    await anonimo(() => recusa(db.query("select public.admin_historico(30)")));
  });

  test("a administração recebe o resumo e o histórico, sem e-mails", async () => {
    const resumo = (await admin(() => db.query("select public.admin_resumo() r"))).rows[0].r;
    for (const chave of ["usuarios", "vagas_salvas", "artigos", "palestrantes", "reportes", "trilhas"]) assert.ok(chave in resumo, chave);
    const historico = (await admin(() => db.query("select public.admin_historico(30) h"))).rows[0].h;
    assert.ok(Array.isArray(historico.dias) && historico.dias.length === 30);
    assert.ok(!/@x\.com/.test(JSON.stringify([resumo, historico])), "o painel não pode expor e-mails");
  });

  test("a tabela de admins não é legível nem alterável por pessoas comuns", async () => {
    assert.equal(await ana(() => contar("admins")), 0);
    await ana(() => recusa(db.exec(`insert into public.admins (user_id) values ('${ANA}')`)));
  });
});

describe("exclusão de conta (LGPD)", () => {
  test("excluir_minha_conta apaga só a própria conta e os dados dela; anônimo não executa", async () => {
    await anonimo(() => recusa(db.query("select public.excluir_minha_conta()")));
    await como("authenticated", GABI, () => db.exec(`insert into public.vagas_salvas (vaga_id) values ('g1')`));
    await como("authenticated", GABI, () => db.exec("select public.excluir_minha_conta()"));
    assert.equal(await contar("vagas_salvas", `user_id = '${GABI}'`), 0);
    assert.equal((await db.query(`select count(*)::int n from auth.users where id = '${GABI}'`)).rows[0].n, 0);
    assert.equal(await contar("vagas_salvas", `user_id = '${ANA}'`), 1, "os dados da Ana continuam");
  });
});

describe("exportar meus dados (portabilidade)", () => {
  test("anônimo não executa", async () => {
    await anonimo(() => recusa(db.query("select public.exportar_meus_dados()")));
  });

  test("a pessoa recebe só os próprios dados, de todas as áreas, sem o user_id", async () => {
    const dados = (await ana(() => db.query("select public.exportar_meus_dados() d"))).rows[0].d;
    assert.equal(dados.conta.id, ANA);
    assert.equal(dados.perfil.nome, "Ana");
    assert.equal(dados.vagas_salvas.length, 1);
    assert.equal(dados.vagas_salvas[0].titulo, "Vaga da Ana");
    assert.equal(dados.trilhas.length, 1);
    assert.ok(dados.artigos_enviados.length >= 1, "os artigos enviados entram");
    assert.ok(dados.relatos_de_vaga.length >= 1, "os relatos entram, mesmo a pessoa não podendo lê-los pela RLS");
    assert.ok(!JSON.stringify(dados).includes('"user_id"'), "sem user_id em lugar nenhum");
    for (const lista of ["vagas_salvas", "trilhas", "artigos_enviados", "cadastros_de_palestrante", "relatos_de_vaga"]) {
      for (const linha of dados[lista]) assert.ok(!("user_id" in linha), `${lista} não deve ter user_id`);
    }
  });

  test("nada de outra pessoa vaza na exportação", async () => {
    const dados = (await ana(() => db.query("select public.exportar_meus_dados() d"))).rows[0].d;
    const texto = JSON.stringify(dados);
    assert.ok(!texto.includes("Vaga da Bia"), "vaga salva da Bia");
    assert.ok(!texto.includes(BIA), "id da Bia");
    assert.ok(!texto.includes("p1@x.com"), "e-mail da Bia (a Ana é p0)");
    assert.equal(dados.cadastros_de_palestrante.length, 0, "o cadastro de palestrante é da Bia, não da Ana");
    const daBia = (await como("authenticated", BIA, () => db.query("select public.exportar_meus_dados() d"))).rows[0].d;
    assert.equal(daBia.cadastros_de_palestrante.length, 1);
    assert.ok(!JSON.stringify(daBia).includes("Vaga da Ana"));
  });

  test("quem ainda não tem perfil nem envios recebe listas vazias, não erro", async () => {
    const dados = (await como("authenticated", ELI, () => db.query("select public.exportar_meus_dados() d"))).rows[0].d;
    assert.equal(dados.perfil, null);
    assert.deepEqual(dados.vagas_salvas, []);
    assert.deepEqual(dados.relatos_de_vaga, []);
  });
});
