import { resumirRelatorioCsp } from "@/lib/seguranca";

/**
 * Recebe os relatos de violação da Content-Security-Policy (modo Report-Only, SEG-02) e os registra no log da hospedagem.
 * Não grava nada em banco, não guarda IP nem parâmetros de endereço, e descarta corpos grandes.
 */
export async function POST(request: Request) {
  try {
    const texto = await request.text();
    if (texto.length > 10_000) return new Response(null, { status: 413 });
    const resumo = resumirRelatorioCsp(JSON.parse(texto));
    if (resumo) console.warn("[csp]", JSON.stringify(resumo));
  } catch {
    // Relato malformado: ignora. Quem envia é o navegador, não há o que corrigir aqui.
  }
  return new Response(null, { status: 204 });
}
