"use client";

import type { ReactNode } from "react";
import { useConta } from "@/lib/conta/contexto";
import { Entrar } from "./entrar";

/**
 * Só mostra `children` (o formulário) para quem está logada; visitante vê o login. A regra de verdade é do banco
 * (as políticas recusam `anon`); isto só evita que a pessoa preencha tudo e perca o que digitou ao ser recusada.
 */
export function ExigirLogin({ children, titulo, texto, voltarPara }: { children: ReactNode; titulo: string; texto: string; voltarPara: string }) {
  const conta = useConta();

  if (conta.fase === "carregando") return <p role="status" className="mt-6 text-suave">Carregando…</p>;
  if (!conta.disponivel) return <p className="mt-6 text-suave">O envio está indisponível neste momento. Tente novamente em instantes.</p>;
  if (conta.fase === "visitante") {
    return (
      <section aria-labelledby="exigir-login" className="mt-6 max-w-xl">
        <h2 id="exigir-login" className="font-display text-xl font-semibold text-titulo">{titulo}</h2>
        <p className="mt-1 text-suave">{texto}</p>
        <Entrar cabecalho={false} voltarPara={voltarPara} />
      </section>
    );
  }
  return <>{children}</>;
}
