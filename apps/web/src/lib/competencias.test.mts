import assert from "node:assert/strict";
import { test } from "node:test";
import { MINIMO_DA_AMOSTRA, calcularCompetencias, lerFiltro, oQueFalta, tituloDoFiltro } from "./competencias.ts";
import type { Vaga } from "./rotulos.ts";

let n = 0;
function vaga(extra: Partial<Vaga>): Vaga {
  n += 1;
  return {
    id: `gupy:${n}`, titulo: `Vaga ${n}`, empresa: "X", uf: null, cidade: null, modelo: null, contrato: null, pcd: false,
    publicada_em: "2026-10-01T00:00:00+00:00", prazo: null, url: "https://x", citadas: ["sql"], duplicatas: 0, enriquecida: false,
    area: "analise_dados", senioridade: "junior", obrigatorias: [], desejaveis: [], salario: null, ...extra,
  };
}
const TUDO = { area: null, nivel: null };

test("o filtro da URL só aceita áreas e níveis conhecidos", () => {
  assert.deepEqual(lerFiltro("bi", "junior"), { area: "bi", nivel: "junior" });
  assert.deepEqual(lerFiltro("area-inventada", "chefe"), TUDO);
  assert.deepEqual(lerFiltro(undefined, undefined), TUDO);
});

test("valores como __proto__ ou toString não passam pelo filtro", () => {
  assert.deepEqual(lerFiltro("__proto__", "toString"), TUDO);
  assert.deepEqual(lerFiltro("constructor", "hasOwnProperty"), TUDO);
});

test("o título descreve o filtro", () => {
  assert.equal(tituloDoFiltro(TUDO), "Todas as áreas · Todos os níveis");
  assert.equal(tituloDoFiltro({ area: "bi", nivel: "junior" }), "BI · Júnior");
});

test("sem área, a área de negócios fica fora do ranking; escolhendo-a, ela entra", () => {
  const vagas = [vaga({ citadas: ["sql"] }), vaga({ area: "negocio_com_dados", citadas: ["excel"] })];
  assert.deepEqual(calcularCompetencias(vagas, TUDO).essenciais.map((e) => e.id), ["sql"]);
  assert.deepEqual(calcularCompetencias(vagas, { area: "negocio_com_dados", nivel: null }).essenciais.map((e) => e.id), ["excel"]);
});

test("vagas sem stacks identificadas não contam", () => {
  const r = calcularCompetencias([vaga({ citadas: [] }), vaga({ citadas: ["sql"] })], TUDO);
  assert.equal(r.total, 1);
  assert.deepEqual(r.essenciais, [{ id: "sql", pct: 100 }]);
});

test("o filtro de nível e o de área restringem as vagas", () => {
  const vagas = [vaga({ senioridade: "junior" }), vaga({ senioridade: "senior" }), vaga({ area: "bi", senioridade: "junior" })];
  assert.equal(calcularCompetencias(vagas, { area: "analise_dados", nivel: "junior" }).total, 1);
  assert.equal(calcularCompetencias(vagas, { area: null, nivel: "senior" }).total, 1);
});

test("percentual = vagas que citam / vagas do filtro, arredondado, do mais pedido ao menos (empate em ordem alfabética)", () => {
  const vagas = [vaga({ citadas: ["sql", "python"] }), vaga({ citadas: ["sql", "dbt"] }), vaga({ citadas: ["sql"] })];
  const r = calcularCompetencias(vagas, TUDO);
  assert.deepEqual(r.essenciais, [{ id: "sql", pct: 100 }, { id: "dbt", pct: 33 }, { id: "python", pct: 33 }]);
});

test("a mesma tecnologia repetida na vaga conta uma vez só", () => {
  const r = calcularCompetencias([vaga({ citadas: ["sql", "sql", "sql"] })], TUDO);
  assert.deepEqual(r.essenciais, [{ id: "sql", pct: 100 }]);
});

test("mostra no máximo as 8 mais pedidas", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `s${String(i).padStart(2, "0")}`);
  const r = calcularCompetencias([vaga({ citadas: ids })], TUDO);
  assert.equal(r.essenciais.length, 8);
});

test("diferenciais só vêm de vagas enriquecidas e não repetem as essenciais", () => {
  const sem = calcularCompetencias([vaga({ citadas: ["sql"] })], TUDO);
  assert.deepEqual(sem.diferenciais, []);
  const com = calcularCompetencias([vaga({ enriquecida: true, obrigatorias: ["sql"], desejaveis: ["sql", "spark"] })], TUDO);
  assert.deepEqual(com.essenciais.map((e) => e.id), ["sql"]);
  assert.deepEqual(com.diferenciais, ["spark"]);
});

test("aviso de amostra pequena abaixo do mínimo", () => {
  const poucas = Array.from({ length: MINIMO_DA_AMOSTRA - 1 }, () => vaga({}));
  const muitas = Array.from({ length: MINIMO_DA_AMOSTRA }, () => vaga({}));
  assert.equal(calcularCompetencias(poucas, TUDO).amostraPequena, true);
  assert.equal(calcularCompetencias(muitas, TUDO).amostraPequena, false);
});

test("sem nenhuma vaga no filtro, o resultado é vazio (sem dividir por zero)", () => {
  const r = calcularCompetencias([], { area: "bi", nivel: "pleno" });
  assert.equal(r.total, 0);
  assert.deepEqual(r.essenciais, []);
  assert.deepEqual(r.fontes, []);
});

test("as fontes são as 4 vagas mais recentes", () => {
  const vagas = ["2026-10-01", "2026-10-05", "2026-10-03", "2026-10-09", "2026-10-07"].map((d) => vaga({ publicada_em: `${d}T00:00:00+00:00` }));
  const datas = calcularCompetencias(vagas, TUDO).fontes.map((v) => v.publicada_em.slice(0, 10));
  assert.deepEqual(datas, ["2026-10-09", "2026-10-07", "2026-10-05", "2026-10-03"]);
});

test("o que falta: as essenciais que a pessoa não tem, na ordem do mercado, até 5", () => {
  const essenciais = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id, i) => ({ id, pct: 90 - i }));
  assert.deepEqual(oQueFalta(essenciais, new Set(["a", "c"])).map((e) => e.id), ["b", "d", "e", "f", "g"]);
  assert.deepEqual(oQueFalta(essenciais, new Set(essenciais.map((e) => e.id))), []);
});
