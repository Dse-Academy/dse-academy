import assert from "node:assert/strict";
import { test } from "node:test";
import { codigoHttp, montarSaude, verificarBanco } from "./saude.ts";

const resposta = (ok: boolean) => async () => ({ ok });

test("banco respondendo: ok, com a consulta feita na view pública e a chave só nos cabeçalhos", async () => {
  let chamada: { url: string; headers: Record<string, string> } | undefined;
  const r = await verificarBanco("https://p.supabase.co/", "chave-publica", async (url, init) => {
    chamada = { url, headers: init.headers };
    return { ok: true };
  });
  assert.equal(r, "ok");
  assert.equal(chamada?.url, "https://p.supabase.co/rest/v1/palestrantes_publicos?select=id&limit=1");
  assert.equal(chamada?.headers.apikey, "chave-publica");
  assert.doesNotMatch(chamada?.url ?? "", /chave-publica/);
});

test("resposta de erro do banco é falha", async () => {
  assert.equal(await verificarBanco("https://p.supabase.co", "k", resposta(false)), "falha");
});

test("erro de rede é falha, sem derrubar o endpoint", async () => {
  const r = await verificarBanco("https://p.supabase.co", "k", async () => { throw new Error("ECONNRESET"); });
  assert.equal(r, "falha");
});

test("banco que demora além do limite é falha", async () => {
  const lento = (_u: string, init: { signal: AbortSignal }) =>
    new Promise<{ ok: boolean }>((_, rejeitar) => init.signal.addEventListener("abort", () => rejeitar(new Error("abortado"))));
  assert.equal(await verificarBanco("https://p.supabase.co", "k", lento, 30), "falha");
});

test("sem configuração do banco não é tratado como falha", async () => {
  assert.equal(await verificarBanco(undefined, "k", resposta(true)), "nao-configurado");
  assert.equal(await verificarBanco("https://p.supabase.co", undefined, resposta(true)), "nao-configurado");
});

test("status e código HTTP: só falha de banco vira 503", () => {
  assert.equal(codigoHttp(montarSaude("abcdef1234567", "ok")), 200);
  assert.equal(codigoHttp(montarSaude("abcdef1234567", "nao-verificado")), 200);
  assert.equal(codigoHttp(montarSaude("abcdef1234567", "nao-configurado")), 200);
  assert.equal(codigoHttp(montarSaude("abcdef1234567", "falha")), 503);
});

test("a versão mostra só os 7 primeiros caracteres do commit, ou 'local'", () => {
  assert.equal(montarSaude("abcdef1234567890", "ok").versao, "abcdef1");
  assert.equal(montarSaude(undefined, "ok").versao, "local");
});
