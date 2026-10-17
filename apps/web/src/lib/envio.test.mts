import assert from "node:assert/strict";
import { test } from "node:test";
import { mensagemDeErroDeEnvio } from "./envio.ts";

test("limite de envios do banco vira uma mensagem de espera", () => {
  assert.match(mensagemDeErroDeEnvio({ message: "limite de envios atingido, tente novamente mais tarde" }), /muitas vezes/);
});

test("política de segurança recusada pede novo login", () => {
  assert.match(mensagemDeErroDeEnvio({ code: "42501", message: "new row violates row-level security policy" }), /Entre de novo/);
  assert.match(mensagemDeErroDeEnvio({ message: "é preciso estar logada para enviar" }), /Entre de novo/);
});

test("qualquer outro erro mostra a mensagem padrão, sem vazar detalhes do banco", () => {
  const m = mensagemDeErroDeEnvio({ message: "duplicate key value violates unique constraint abc" });
  assert.match(m, /Não foi possível enviar agora/);
  assert.doesNotMatch(m, /duplicate|constraint/);
  assert.match(mensagemDeErroDeEnvio(null), /Não foi possível enviar agora/);
});
