import assert from "node:assert/strict";
import { test } from "node:test";
import { CABECALHOS_DE_SEGURANCA, regrasDeCabecalhos } from "./seguranca.ts";

const valor = (chave: string) => CABECALHOS_DE_SEGURANCA.find((c) => c.key === chave)?.value;

test("os cabeçalhos de segurança obrigatórios existem (SEG-01)", () => {
  assert.equal(valor("X-Content-Type-Options"), "nosniff");
  assert.equal(valor("X-Frame-Options"), "DENY");
  assert.equal(valor("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.ok(valor("Permissions-Policy"));
  assert.equal(valor("Cross-Origin-Opener-Policy"), "same-origin");
});

test("a Permissions-Policy desliga os recursos que o site não usa", () => {
  // Comparação exata de texto (sem regex): "camera=()" significa "nenhuma origem pode usar a câmera".
  const diretivas = (valor("Permissions-Policy") ?? "").split(",").map((d) => d.trim());
  for (const recurso of ["camera", "microphone", "geolocation", "payment"]) {
    assert.ok(diretivas.includes(`${recurso}=()`), recurso);
  }
});

test("nenhum cabeçalho está duplicado nem vazio", () => {
  const chaves = CABECALHOS_DE_SEGURANCA.map((c) => c.key.toLowerCase());
  assert.equal(new Set(chaves).size, chaves.length);
  for (const c of CABECALHOS_DE_SEGURANCA) assert.ok(c.value.trim().length > 0, c.key);
});

test("as regras valem para todas as rotas", () => {
  const regras = regrasDeCabecalhos();
  assert.equal(regras.length, 1);
  assert.equal(regras[0].source, "/:path*");
  assert.deepEqual(regras[0].headers, CABECALHOS_DE_SEGURANCA);
});
