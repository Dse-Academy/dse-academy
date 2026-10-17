/**
 * Perfil de competências: o que o mercado pede numa área e num nível, a partir das vagas abertas.
 * Porta o cálculo do site antigo (aposentado; app/web/app.js no histórico do Git) em funções puras.
 */

import { stacksDaVaga } from "./aderencia.ts";
import { AREAS, NOME_NIVEL, type Vaga } from "./rotulos.ts";

/** Funções de negócio que usam dados: aparecem na busca, mas não entram nos rankings de "todas as áreas". */
const AREA_DE_NEGOCIO = "negocio_com_dados";

/** Abaixo disto o ranking tem pouca base e a tela avisa "amostra pequena". */
export const MINIMO_DA_AMOSTRA = 20;
const QUANTAS_ESSENCIAIS = 8;
const QUANTOS_DIFERENCIAIS = 6;
const QUANTAS_FONTES = 4;

export type FiltroCompetencias = { area: string | null; nivel: string | null };
export type Contagem = { id: string; pct: number };

export type Competencias = {
  titulo: string;
  /** Quantas vagas (com stacks identificadas) entraram no cálculo. */
  total: number;
  amostraPequena: boolean;
  /** As tecnologias mais pedidas, com o % das vagas que as citam. */
  essenciais: Contagem[];
  /** Só existem com vagas enriquecidas por LLM: a palavra-chave não separa obrigatória de desejável. */
  diferenciais: string[];
  /** As vagas mais recentes usadas no cálculo. */
  fontes: Vaga[];
};

const temChave = (objeto: object, chave: string) => Object.prototype.hasOwnProperty.call(objeto, chave);

/** Lê o filtro da URL: ignora qualquer valor que não seja uma área ou um nível conhecidos. */
export function lerFiltro(area: string | undefined, nivel: string | undefined): FiltroCompetencias {
  return {
    area: area && temChave(AREAS, area) ? area : null,
    nivel: nivel && temChave(NOME_NIVEL, nivel) ? nivel : null,
  };
}

export function tituloDoFiltro(f: FiltroCompetencias): string {
  return `${f.area ? AREAS[f.area] : "Todas as áreas"} · ${f.nivel ? NOME_NIVEL[f.nivel] : "Todos os níveis"}`;
}

/** Contagem por id, do mais frequente ao menos; o empate segue a ordem alfabética do id (resultado estável). */
function contar(vagas: Vaga[], idsDe: (v: Vaga) => string[]): [string, number][] {
  const c = new Map<string, number>();
  for (const v of vagas) for (const id of new Set(idsDe(v))) c.set(id, (c.get(id) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function calcularCompetencias(vagas: Vaga[], filtro: FiltroCompetencias): Competencias {
  const pool = vagas.filter(
    (v) =>
      stacksDaVaga(v).todas.length > 0 &&
      (filtro.area ? v.area === filtro.area : v.area !== AREA_DE_NEGOCIO) &&
      (!filtro.nivel || v.senioridade === filtro.nivel),
  );
  const total = pool.length;
  const pct = (n: number) => Math.round((100 * n) / total);

  const essenciais = contar(pool, (v) => stacksDaVaga(v).principais).slice(0, QUANTAS_ESSENCIAIS);
  const idsEssenciais = new Set(essenciais.map(([id]) => id));
  const diferenciais = contar(pool, (v) => (v.enriquecida ? v.desejaveis : []))
    .filter(([id]) => !idsEssenciais.has(id))
    .slice(0, QUANTOS_DIFERENCIAIS)
    .map(([id]) => id);
  const fontes = [...pool].sort((a, b) => (Date.parse(b.publicada_em) || 0) - (Date.parse(a.publicada_em) || 0)).slice(0, QUANTAS_FONTES);

  return {
    titulo: tituloDoFiltro(filtro),
    total,
    amostraPequena: total < MINIMO_DA_AMOSTRA,
    essenciais: total ? essenciais.map(([id, n]) => ({ id, pct: pct(n) })) : [],
    diferenciais,
    fontes,
  };
}

/** O que priorizar: as essenciais que a pessoa ainda não tem, na ordem do mercado. */
export function oQueFalta(essenciais: Contagem[], conhecidas: Set<string>, quantas = 5): Contagem[] {
  return essenciais.filter((e) => !conhecidas.has(e.id)).slice(0, quantas);
}
