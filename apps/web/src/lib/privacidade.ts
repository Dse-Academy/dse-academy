import { EMAIL_CONTATO } from "./contato.ts";

/**
 * Versão da Política de Privacidade em vigor. É gravada junto com cada envio de formulário (requisito PRIV-03), para saber
 * a qual texto a pessoa deu o aceite. Mude SEMPRE que o texto da página /privacidade mudar de forma relevante.
 * Formato AAAA-MM-DD (data em que a versão passou a valer).
 */
export const VERSAO_POLITICA = "2026-10-17";

/** Versão dos Termos de Uso em vigor (AAAA-MM-DD). Mude quando o texto de /termos mudar de forma relevante. */
export const VERSAO_TERMOS = "2026-11-01";

/** Quem responde pelos dados (controlador). Pode ser ajustado sem mexer no código pela variável de ambiente. */
export const RESPONSAVEL_PELOS_DADOS =
  process.env.NEXT_PUBLIC_PRIVACIDADE_RESPONSAVEL || "DSE Academy (comunidade DSE, Data Science Engineering Community)";

/** Canal para pedidos sobre dados pessoais (LGPD). Por padrão, o mesmo e-mail oficial de contato. */
export const CONTATO_PRIVACIDADE = process.env.NEXT_PUBLIC_PRIVACIDADE_CONTATO || EMAIL_CONTATO;

/** "2026-10-17" -> "17/10/2026". */
export function dataDaVersao(versao: string = VERSAO_POLITICA): string {
  const [a, m, d] = versao.split("-");
  return a && m && d ? `${d}/${m}/${a}` : versao;
}
