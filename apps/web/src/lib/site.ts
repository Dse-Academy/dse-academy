/**
 * Endereço público do site, usado em canonical, Open Graph, robots.txt e sitemap.xml (requisito PROD-01).
 * Ordem: SITE_URL (definido quando houver domínio próprio, OPS-01) → domínio de produção da Vercel → endereço atual.
 */
export const ENDERECO_PADRAO = "https://dse-academy-chi.vercel.app";

export function urlDoSite(env: Record<string, string | undefined> = process.env): string {
  const bruto = env.SITE_URL?.trim() || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}` : "") || ENDERECO_PADRAO;
  const comProtocolo = /^https?:\/\//.test(bruto) ? bruto : `https://${bruto}`;
  return comProtocolo.replace(/\/+$/, "");
}

/** Páginas que não devem aparecer em buscadores: área da pessoa, administração e endpoints. */
export const CAMINHOS_PRIVADOS = ["/admin", "/perfil", "/boas-vindas", "/api/"];

export type EntradaSitemap = { url: string; lastModified?: Date; changeFrequency?: "daily" | "weekly" | "monthly"; priority?: number };

/** Monta o sitemap: páginas fixas + uma entrada por vaga e por trilha. `atualizadoEm` é a data da última coleta (ou vazio). */
export function montarSitemap(base: string, slugsDeVagas: string[], idsDeTrilhas: string[], atualizadoEm?: string): EntradaSitemap[] {
  const data = atualizadoEm && !Number.isNaN(Date.parse(atualizadoEm)) ? new Date(atualizadoEm) : undefined;
  const fixas: EntradaSitemap[] = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/vagas`, lastModified: data, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/trilhas`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/competencias`, lastModified: data, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/artigos/enviar`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/palestrantes/cadastro`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/contato`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacidade`, changeFrequency: "monthly", priority: 0.3 },
  ];
  const vagas = slugsDeVagas.map((s) => ({ url: `${base}/vagas/${encodeURIComponent(s)}`, lastModified: data, changeFrequency: "weekly" as const, priority: 0.6 }));
  const trilhas = idsDeTrilhas.map((id) => ({ url: `${base}/trilhas/${encodeURIComponent(id)}`, changeFrequency: "monthly" as const, priority: 0.6 }));
  return [...fixas, ...vagas, ...trilhas];
}

/** Pré-visualização ao compartilhar (Open Graph e Twitter) com o título da própria página; o Next não mescla o `openGraph` da raiz. */
export function paraCompartilhar(titulo: string, descricao: string) {
  const imagem = { url: "/logo.png", width: 256, height: 256, alt: "DSE Academy" };
  return {
    openGraph: { type: "website" as const, siteName: "DSE Academy", locale: "pt_BR", title: titulo, description: descricao, images: [imagem] },
    twitter: { card: "summary" as const, title: titulo, description: descricao, images: [imagem.url] },
  };
}
