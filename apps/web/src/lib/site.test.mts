import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMINHOS_PRIVADOS, ENDERECO_PADRAO, montarSitemap, urlDoSite } from "./site.ts";

test("SITE_URL manda; sem barra no fim e com https", () => {
  assert.equal(urlDoSite({ SITE_URL: "https://dse.org.br/" }), "https://dse.org.br");
  assert.equal(urlDoSite({ SITE_URL: "dse.org.br" }), "https://dse.org.br");
});

test("sem SITE_URL usa o domínio de produção da Vercel, e por fim o endereço padrão", () => {
  assert.equal(urlDoSite({ VERCEL_PROJECT_PRODUCTION_URL: "dse-academy-chi.vercel.app" }), "https://dse-academy-chi.vercel.app");
  assert.equal(urlDoSite({}), ENDERECO_PADRAO);
});

test("o sitemap lista páginas fixas, vagas e trilhas, sem áreas privadas", () => {
  const s = montarSitemap("https://x.org", ["a-1", "b c"], ["engenharia_dados"], "2026-10-30T11:09:01Z");
  const urls = s.map((e) => e.url);
  assert.ok(urls.includes("https://x.org/"));
  assert.ok(urls.includes("https://x.org/vagas/a-1"));
  assert.ok(urls.includes("https://x.org/vagas/b%20c"));
  assert.ok(urls.includes("https://x.org/trilhas/engenharia_dados"));
  assert.equal(new Set(urls).size, urls.length);
  for (const caminho of CAMINHOS_PRIVADOS) assert.ok(!urls.some((u) => u.includes(caminho.replace(/\/$/, ""))), caminho);
});

test("data inválida de coleta não quebra o sitemap", () => {
  const s = montarSitemap("https://x.org", ["a"], [], "isto não é data");
  assert.equal(s.find((e) => e.url.endsWith("/vagas/a"))?.lastModified, undefined);
});
