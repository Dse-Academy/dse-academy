/**
 * Cabeçalhos de segurança enviados em todas as respostas do site (requisito SEG-01).
 * Ficam aqui, e não direto no next.config.ts, para poderem ser testados: o teste falha se algum sumir.
 * O Strict-Transport-Security (HSTS) já é enviado pela hospedagem.
 * A Content-Security-Policy é um requisito à parte (SEG-02): o script de tema da página é inline e precisa de nonce antes.
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

/** Formato esperado pela opção `headers()` do Next.js: aplica a todas as rotas. */
export function regrasDeCabecalhos(): { source: string; headers: CabecalhoHttp[] }[] {
  return [{ source: "/:path*", headers: CABECALHOS_DE_SEGURANCA }];
}
