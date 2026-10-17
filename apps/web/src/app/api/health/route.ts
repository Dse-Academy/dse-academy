import { codigoHttp, montarSaude, verificarBanco, type SituacaoBanco } from "@/lib/saude";

/**
 * Endpoint de saúde para monitores de disponibilidade.
 *  GET /api/health        -> o site está de pé (barato, não toca o banco)
 *  GET /api/health?db=1   -> também confere o banco (uma consulta mínima, limite de 3 s); 503 se falhar
 */
export async function GET(request: Request) {
  const comBanco = new URL(request.url).searchParams.get("db") === "1";
  const banco: SituacaoBanco = comBanco
    ? await verificarBanco(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, fetch)
    : "nao-verificado";
  const saude = montarSaude(process.env.VERCEL_GIT_COMMIT_SHA, banco);
  return Response.json(saude, { status: codigoHttp(saude), headers: { "Cache-Control": "no-store" } });
}
