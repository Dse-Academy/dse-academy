"use client";

import Link from "next/link";
import { useEffect } from "react";
import { estiloBotao } from "@/lib/botoes";

/** Erro inesperado numa página (o cabeçalho e o rodapé do site continuam). Nesta versão do Next.js a função de nova tentativa chama-se `retry`. */
export default function ErroDaPagina({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section aria-labelledby="titulo-erro" className="mx-auto max-w-xl py-10 text-center">
      <h1 id="titulo-erro" className="font-display text-3xl font-bold text-titulo">Algo deu errado</h1>
      <p className="mt-3 text-suave">
        Tivemos um problema ao carregar esta página. Isso costuma passar sozinho: tente de novo em instantes. Se continuar, avise a equipe pelo <Link href="/contato" className="text-link underline">Fale conosco</Link>.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className={estiloBotao("primario")}>Tentar de novo</button>
        <Link href="/" className={estiloBotao("secundario")}>Voltar ao início</Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-suave">Código do erro (para a equipe): {error.digest}</p>}
    </section>
  );
}
