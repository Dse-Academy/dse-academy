import type { Metadata } from "next";
import Link from "next/link";
import { estiloBotao } from "@/lib/botoes";

export const metadata: Metadata = { title: "Página não encontrada" };

/** 404: vale para endereços inexistentes e para vagas e trilhas que saíram do ar. */
export default function NaoEncontrada() {
  return (
    <section aria-labelledby="titulo-404" className="mx-auto max-w-xl py-10 text-center">
      <p className="font-display text-6xl font-bold text-link" aria-hidden="true">404</p>
      <h1 id="titulo-404" className="mt-2 font-display text-3xl font-bold text-titulo">Página não encontrada</h1>
      <p className="mt-3 text-suave">
        O endereço pode estar errado ou a página mudou de lugar. Se você procurava uma vaga, ela pode ter sido encerrada e saído da lista.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={estiloBotao("primario")}>Ir para o início</Link>
        <Link href="/vagas" className={estiloBotao("secundario")}>Ver as vagas</Link>
        <Link href="/trilhas" className={estiloBotao("secundario")}>Trilhas de estudo</Link>
      </div>
    </section>
  );
}
