/** Mensagem para a pessoa quando um envio (artigo, palestrante ou relato) é recusado pelo banco. */

const PADRAO = "Não foi possível enviar agora. Tente de novo em instantes.";

/** O banco recusa com "limite de envios atingido" (migration 009) quando a pessoa passou do teto numa janela de tempo. */
export function mensagemDeErroDeEnvio(erro: { message?: string; code?: string } | null | undefined): string {
  const texto = (erro?.message ?? "").toLowerCase();
  if (texto.includes("limite de envios")) return "Você já enviou muitas vezes por enquanto. Tente de novo mais tarde.";
  // 42501 = a política de segurança recusou: quase sempre é a sessão que expirou. Pedir novo login resolve.
  if (erro?.code === "42501" || texto.includes("row-level security") || texto.includes("é preciso estar logada")) {
    return "Sua sessão expirou. Entre de novo para enviar.";
  }
  return PADRAO;
}
