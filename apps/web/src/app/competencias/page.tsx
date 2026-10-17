import type { Metadata } from "next";
import Link from "next/link";
import { calcularCompetencias, lerFiltro } from "@/lib/competencias";
import { passosDasStacks } from "@/lib/ligacao-trilhas";
import { AREAS, NIVEIS, haQuanto, slugDaVaga } from "@/lib/rotulos";
import { SKILLS } from "@/lib/taxonomia";
import { carregarTrilhas } from "@/lib/trilhas";
import { carregarVagas } from "@/lib/vagas";
import { estiloBotao } from "@/lib/botoes";
import { Priorizar, type Essencial } from "./priorizar";

export const metadata: Metadata = {
  title: "O que o mercado pede",
  description: "As tecnologias mais pedidas nas vagas abertas de dados no Brasil, por área e por nível, e o que priorizar para a sua próxima vaga.",
};

const campo = "mt-1 w-full rounded-lg border border-borda bg-superficie px-3 py-2";

/** Primeiro valor de um parâmetro da URL (a URL pode repetir o mesmo nome). */
const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Pagina(props: PageProps<"/competencias">) {
  const params = await props.searchParams;
  const filtro = lerFiltro(primeiro(params.area), primeiro(params.nivel));

  const { vagas } = carregarVagas();
  const r = calcularCompetencias(vagas, filtro);
  const { trilhas } = carregarTrilhas();
  const passos = passosDasStacks(r.essenciais.map((e) => e.id), filtro.area, trilhas);

  // Só mostra as áreas que têm vagas, da mais para a menos frequente.
  const contagemDeAreas = new Map<string, number>();
  for (const v of vagas) if (v.area) contagemDeAreas.set(v.area, (contagemDeAreas.get(v.area) ?? 0) + 1);
  const areas = [...contagemDeAreas.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

  const essenciais: Essencial[] = r.essenciais.map((e) => ({
    id: e.id,
    nome: SKILLS[e.id] ?? e.id,
    pct: e.pct,
    trilha: passos[e.id] ? { href: passos[e.id].href, texto: `Estudar na ${passos[e.id].trilhaTitulo}: ${passos[e.id].etapaTitulo}` } : null,
  }));

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-wide text-link">Perfil de competências</p>
      <h1 className="font-display text-3xl font-bold text-titulo">O que o mercado pede para a sua próxima vaga</h1>
      <p className="mt-2 max-w-2xl text-suave">
        Contamos as tecnologias citadas nas vagas abertas da função e do nível que você escolher. O endereço desta página guarda a sua escolha: dá para
        compartilhar.
      </p>

      <form method="get" action="/competencias" className="mt-6 grid max-w-3xl gap-4 rounded-2xl border border-borda bg-superficie p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="area" className="block font-medium text-titulo">Função</label>
          <select id="area" name="area" defaultValue={filtro.area ?? ""} className={campo}>
            <option value="">Todas as áreas</option>
            {areas.map((id) => <option key={id} value={id}>{AREAS[id] ?? id}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nivel" className="block font-medium text-titulo">Senioridade</label>
          <select id="nivel" name="nivel" defaultValue={filtro.nivel ?? ""} className={campo}>
            <option value="">Todos os níveis</option>
            {NIVEIS.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        <button type="submit" className={estiloBotao("primario")}>Ver o que o mercado pede</button>
      </form>

      <section aria-labelledby="resultado" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 id="resultado" className="font-display text-2xl font-semibold text-titulo">{r.titulo}</h2>
            <p className="text-suave">
              Baseado em <strong className="text-titulo">{r.total}</strong> {r.total === 1 ? "vaga aberta" : "vagas abertas"} com tecnologias identificadas
            </p>
          </div>
          {r.total > 0 && r.amostraPequena && (
            <span className="rounded-full border border-erro px-3 py-1 text-xs font-bold uppercase tracking-wide text-erro">Amostra pequena</span>
          )}
        </div>

        {r.total === 0 ? (
          <div className="mt-6 rounded-2xl border border-borda bg-superficie p-5">
            <strong className="text-titulo">Nenhuma vaga aberta para esse filtro.</strong>
            <p className="mt-1 text-suave">Escolha outra função ou outro nível.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-borda bg-superficie p-5">
              <h3 className="font-display text-lg font-semibold text-titulo">Mais pedidas</h3>
              <p className="text-sm text-suave">Em quantos % das vagas a tecnologia aparece</p>
              <ul className="mt-4 space-y-3">
                {essenciais.map((e) => (
                  <li key={e.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-tinta">{e.nome}</span>
                      <strong className="text-titulo">{e.pct}%</strong>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-fundo" role="img" aria-label={`${e.nome}: ${e.pct}% das vagas`}>
                      <div className="h-full rounded-full bg-azul" style={{ width: `${Math.max(e.pct, 2)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              {r.diferenciais.length > 0 && (
                <>
                  <h3 className="mt-6 font-display text-lg font-semibold text-titulo">Diferenciais</h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {r.diferenciais.map((id) => <li key={id} className="rounded-full border border-borda px-3 py-1 text-sm text-suave">{SKILLS[id] ?? id}</li>)}
                  </ul>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-borda bg-superficie p-5">
              <h3 className="font-display text-lg font-semibold text-titulo">O que priorizar</h3>
              <div className="mt-3"><Priorizar essenciais={essenciais} /></div>
            </div>
          </div>
        )}

        {r.fontes.length > 0 && (
          <div className="mt-6">
            <h3 className="font-display text-lg font-semibold text-titulo">Vagas usadas no cálculo (as mais recentes)</h3>
            <ul className="mt-2 space-y-1">
              {r.fontes.map((v) => (
                <li key={v.id}>
                  <Link href={`/vagas/${slugDaVaga(v.id)}`} className="text-link underline">{v.titulo}</Link>
                  <span className="text-suave"> · {v.empresa} · {haQuanto(v.publicada_em)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3"><Link href="/vagas" className="text-link underline">Ver todas as vagas</Link></p>
          </div>
        )}
      </section>

      <p className="mt-8 max-w-2xl text-sm text-suave">
        As tecnologias vêm da descrição das vagas por palavra-chave: uma tecnologia citada como alternativa (&quot;AWS, Azure ou GCP&quot;) conta para todas. Use os
        números como referência do mercado, não como regra.
      </p>
    </>
  );
}
