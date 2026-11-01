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
  for (const c of CABECALHOS_DE_SEGURANCA) assert.ok(regras[0].headers.some((h) => h.key === c.key && h.value === c.value), c.key);
});

test("a CSP fecha o essencial e libera só o banco como origem externa (SEG-02)", async () => {
  const { montarCsp } = await import("./seguranca.ts");
  const csp = montarCsp("https://abc.supabase.co");
  for (const parte of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "report-uri /api/csp-report"]) {
    assert.ok(csp.split("; ").includes(parte), parte);
  }
  assert.ok(csp.includes("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co"));
  assert.ok(!csp.includes("*"), "sem curingas");
});

test("sem endereço do banco (ou inválido) a CSP continua válida", async () => {
  const { montarCsp } = await import("./seguranca.ts");
  assert.ok(montarCsp(undefined).includes("connect-src 'self'"));
  assert.ok(montarCsp("isto não é url").includes("connect-src 'self'"));
});

test("a CSP sai em modo Report-Only e só nesse modo", async () => {
  const { regrasDeCabecalhos } = await import("./seguranca.ts");
  const chaves = regrasDeCabecalhos("https://abc.supabase.co")[0].headers.map((h) => h.key);
  assert.ok(chaves.includes("Content-Security-Policy-Report-Only"));
  assert.ok(!chaves.includes("Content-Security-Policy"));
});

test("o resumo do relato de violação não guarda parâmetros do endereço", async () => {
  const { resumirRelatorioCsp } = await import("./seguranca.ts");
  const r = resumirRelatorioCsp({ "csp-report": { "document-uri": "https://x.org/perfil?token=segredo#a", "violated-directive": "script-src-elem", "blocked-uri": "https://cdn.exemplo.com/a.js?id=1" } });
  assert.deepEqual(r, { diretiva: "script-src-elem", bloqueado: "https://cdn.exemplo.com/a.js", pagina: "https://x.org/perfil" });
  assert.equal(resumirRelatorioCsp({ lixo: 1 }), null);
  assert.equal(resumirRelatorioCsp(null), null);
});
