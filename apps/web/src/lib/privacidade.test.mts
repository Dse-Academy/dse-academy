import assert from "node:assert/strict";
import { test } from "node:test";
import { VERSAO_POLITICA, dataDaVersao } from "./privacidade.ts";

test("a versão da política é uma data AAAA-MM-DD válida", () => {
  assert.match(VERSAO_POLITICA, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(Date.parse(VERSAO_POLITICA)));
});

test("dataDaVersao mostra dia/mês/ano e devolve o texto original se o formato for outro", () => {
  assert.equal(dataDaVersao("2026-10-17"), "17/10/2026");
  assert.equal(dataDaVersao("rascunho"), "rascunho");
});
