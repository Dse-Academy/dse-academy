/**
 * Cabeçalhos de segurança enviados em todas as respostas do site (requisito SEG-01).
 * Ficam aqui, e não direto no next.config.ts, para poderem ser testados: o teste falha se algum sumir.
 * O Strict-Transport-Security (HSTS) já é enviado pela hospedagem.
 * A Content-Security-Policy (SEG-02) começa em modo Report-Only: o navegador só relata o que bloquearia, sem bloquear nada.
 */
export type CabecalhoHttp = { key: string; value: string };

export const CABECALHOS_DE_SEGURANCA: CabecalhoHttp[] = [
  // O navegador não "adivinha" o tipo do arquivo: evita executar como script algo que não é script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Ninguém pode colocar o site dentro de um iframe (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Ao sair para outro site, só o endereço de origem vai no Referer, nunca o caminho nem parâmetros.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O site não usa estes recursos do navegador: desligados, nenhum script (nosso ou de terceiro) consegue pedi-los.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  // Isola a janela do site de outras origens (o login com Google é um redirecionamento, não um popup).
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** Rota que recebe os relatos de violação da CSP. */
export const ROTA_RELATORIO_CSP = "/api/csp-report";

/**
 * Content-Security-Policy. Vale para scripts e estilos `'unsafe-inline'` por enquanto: o Next injeta scripts inline para hidratar a
 * página e o script de tema também é inline. Trocar por nonce obriga todas as páginas a serem geradas a cada visita (perde-se o cache
 * estático da CDN), então fica como etapa seguinte; hoje a política já fecha plugins, `<base>`, formulários para outros sites,
 * iframes sobre o site e conexões/imagens/fontes de origens desconhecidas.
 * `urlDoBanco` é o endereço do Supabase (a única origem externa que o navegador acessa por fetch/WebSocket).
 */
export function montarCsp(urlDoBanco?: string): string {
  let banco: string[] = [];
  try {
    if (urlDoBanco) {
      const u = new URL(urlDoBanco);
      banco = [u.origin, `${u.protocol === "https:" ? "wss:" : "ws:"}//${u.host}`];
    }
  } catch {
    banco = [];
  }
  const diretivas: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-inline'"]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...banco]],
    ["frame-src", ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ];
  return [...diretivas.map(([nome, valores]) => `${nome} ${valores.join(" ")}`), `report-uri ${ROTA_RELATORIO_CSP}`].join("; ");
}

/** Formato esperado pela opção `headers()` do Next.js: aplica a todas as rotas. */
export function regrasDeCabecalhos(urlDoBanco: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): { source: string; headers: CabecalhoHttp[] }[] {
  return [{ source: "/:path*", headers: [...CABECALHOS_DE_SEGURANCA, { key: "Content-Security-Policy-Report-Only", value: montarCsp(urlDoBanco) }] }];
}

/**
 * Resume um relato de violação para o log, sem dados pessoais: o endereço da página perde parâmetros e fragmento,
 * e só ficam a diretiva violada, o tipo de origem bloqueada e o arquivo. Aceita os dois formatos (report-uri e Reporting API).
 */
export function resumirRelatorioCsp(corpo: unknown): { diretiva: string; bloqueado: string; pagina: string } | null {
  const bruto = corpo as Record<string, unknown> | undefined;
  const dados = (bruto?.["csp-report"] ?? (bruto?.body as unknown) ?? bruto) as Record<string, unknown> | undefined;
  if (!dados || typeof dados !== "object") return null;
  const texto = (...chaves: string[]) => {
    for (const c of chaves) if (typeof dados[c] === "string") return dados[c] as string;
    return "";
  };
  const diretiva = texto("violated-directive", "effectiveDirective", "effective-directive");
  if (!diretiva) return null;
  const limpar = (u: string) => {
    if (!u || /^(inline|eval|self|data|blob)$/.test(u)) return u;
    try {
      const x = new URL(u);
      return `${x.origin}${x.pathname}`;
    } catch {
      return u.slice(0, 80);
    }
  };
  return {
    diretiva: diretiva.slice(0, 60),
    bloqueado: limpar(texto("blocked-uri", "blockedURL", "blockedURI")).slice(0, 200),
    pagina: limpar(texto("document-uri", "documentURL")).slice(0, 200),
  };
}
