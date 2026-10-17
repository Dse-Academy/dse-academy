/** Estado de saúde do site, para monitores (requisito DISP-04). Não expõe segredos nem dados de pessoas. */

export type SituacaoBanco = "ok" | "falha" | "nao-configurado" | "nao-verificado";

export type Saude = {
  status: "ok" | "degradado";
  /** Versão publicada: os 7 primeiros caracteres do commit (vem da hospedagem). */
  versao: string;
  banco: SituacaoBanco;
};

type Buscar = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean }>;

/**
 * Faz uma consulta mínima à view pública do banco (a mesma da rotina anti-pausa). Qualquer erro, resposta diferente de 200
 * ou demora acima do limite conta como falha: o monitor precisa saber que o banco não está respondendo.
 */
export async function verificarBanco(
  url: string | undefined,
  chavePublica: string | undefined,
  buscar: Buscar,
  limiteMs = 3000,
): Promise<SituacaoBanco> {
  if (!url || !chavePublica) return "nao-configurado";
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), limiteMs);
  try {
    const r = await buscar(`${url.replace(/\/$/, "")}/rest/v1/palestrantes_publicos?select=id&limit=1`, {
      headers: { apikey: chavePublica, Authorization: `Bearer ${chavePublica}` },
      signal: controle.signal,
    });
    return r.ok ? "ok" : "falha";
  } catch {
    return "falha";
  } finally {
    clearTimeout(timer);
  }
}

export function montarSaude(commit: string | undefined, banco: SituacaoBanco): Saude {
  return {
    status: banco === "falha" ? "degradado" : "ok",
    versao: (commit ?? "local").slice(0, 7),
    banco,
  };
}

/** Código HTTP: 200 saudável, 503 se o banco foi verificado e falhou (monitores tratam 503 como alerta). */
export function codigoHttp(s: Saude): number {
  return s.status === "ok" ? 200 : 503;
}
