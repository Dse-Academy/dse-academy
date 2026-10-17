"use client";

import Link from "next/link";
import { useMemo } from "react";
import { conhecidasDe } from "@/lib/aderencia";
import { oQueFalta } from "@/lib/competencias";
import { useConta } from "@/lib/conta/contexto";
import { PAIS, SINONIMOS } from "@/lib/taxonomia";
import { estiloBotao } from "@/lib/botoes";

export type Essencial = { id: string; nome: string; pct: number; trilha: { href: string; texto: string } | null };

/**
 * "O que priorizar": cruza as tecnologias mais pedidas com as habilidades do perfil. É a parte pessoal da tela, então só
 * aparece para quem está logada (o ranking do mercado, ao lado, é público). Nada do que está no perfil vai para a URL.
 */
export function Priorizar({ essenciais }: { essenciais: Essencial[] }) {
  const conta = useConta();
  const logada = conta.fase === "logada";
  const habilidades = useMemo(() => (logada ? conta.habilidades : []), [logada, conta.habilidades]);
  const conhecidas = useMemo(() => conhecidasDe(habilidades, SINONIMOS, PAIS), [habilidades]);
  const falta = useMemo(() => oQueFalta(essenciais, conhecidas.ids), [essenciais, conhecidas]);
  const nome = (id: string) => essenciais.find((e) => e.id === id)?.nome ?? id;
  const trilhaDe = (id: string) => essenciais.find((e) => e.id === id)?.trilha ?? null;

  if (essenciais.length === 0) return <p className="text-suave">Sem vagas neste filtro, não há o que priorizar.</p>;
  if (conta.fase === "carregando" || (logada && !conta.dadosProntos)) return <p role="status" className="text-suave">Carregando…</p>;

  if (!logada) {
    return conta.disponivel ? (
      <div>
        <p className="text-suave">Entre para ver o que falta no seu perfil: cruzamos o que o mercado pede aqui com as habilidades que você informou.</p>
        <Link href="/perfil" className={`mt-4 ${estiloBotao("primario")}`}>Entrar e ver o que falta</Link>
      </div>
    ) : null;
  }

  if (habilidades.length === 0) {
    return (
      <p className="text-suave">
        Você ainda não informou habilidades. <Link href="/perfil" className="text-link underline">Adicione em Meu perfil</Link> para ver o que falta.
      </p>
    );
  }

  const jaSabe = essenciais.filter((e) => conhecidas.ids.has(e.id)).map((e) => e.nome);
  return (
    <div>
      <p className="text-sm text-suave">
        Com base no seu perfil
        {jaSabe.length > 0 ? <>, você já cobre <strong className="text-titulo">{jaSabe.join(", ")}</strong>.</> : <>, nenhuma destas tecnologias está entre as suas habilidades ainda.</>}
      </p>
      {falta.length === 0 ? (
        <p className="mt-3 text-tinta">Você já cobre todas as tecnologias mais pedidas deste filtro.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {falta.map((e, i) => {
            const trilha = trilhaDe(e.id);
            return (
              <li key={e.id} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-marinho text-sm font-semibold text-white" aria-hidden="true">{i + 1}</span>
                <span>
                  <strong className="text-titulo">{nome(e.id)}</strong>
                  <span className="block text-sm text-suave">pedida em {e.pct}% das vagas deste filtro</span>
                  {trilha && <Link href={trilha.href} className="block text-sm text-link underline">{trilha.texto}</Link>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {conhecidas.naoReconhecidas.length > 0 && (
        <p className="mt-3 text-xs text-suave">Habilidades do perfil que não reconhecemos: {conhecidas.naoReconhecidas.join(", ")}.</p>
      )}
    </div>
  );
}
