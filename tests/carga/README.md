# Teste de carga

Requisito **DESEMP-02** (issue #49): provar, antes de divulgar, que o site aguenta a comunidade. Metas do plano de escala
([`docs/escala-1000-usuarios.md`](../../docs/escala-1000-usuarios.md)): páginas com p95 ≤ 300 ms, API com p95 ≤ 300 ms e p99 ≤ 800 ms,
menos de 0,5% de erros, 500 pessoas simultâneas sem queda, e o conteúdo público no ar mesmo com o banco fora.

> ## ⚠️ Nunca rode isto contra a produção
> A Vercel e o plano gratuito do Supabase não devem receber carga artificial (a hospedagem pode bloquear a conta, e o banco real tem
> dados de pessoas). Tudo aqui roda **no seu computador**, num ambiente descartável.

## O que é testado

| Cenário | Arquivo | O que faz | Passa quando |
|---|---|---|---|
| Navegação pública | `k6/publico.js` | 300 pessoas simultâneas sem login: home, vagas, uma vaga, trilhas, competências, `/api/health` | p95 das páginas ≤ 300 ms, erros < 0,5% |
| Pessoas logadas | `k6/logada.js` | 150 pessoas: perfil, vagas salvas, é admin?, inscrições, e às vezes salvar vaga ou marcar progresso | p95 ≤ 300 ms, p99 ≤ 800 ms, erros < 0,5% |
| Pico de divulgação | `k6/pico.js` | rampa até 500 (350 sem login + 150 logadas) em 2 min, platô de 5 min | os dois limites acima, sem queda |
| Abuso dos formulários | `k6/abuso.js` | 50 envios anônimos por segundo; uma pessoa tentando 45 relatos seguidos; 100 pessoas usando normalmente ao mesmo tempo | **0** envios anônimos aceitos; no máximo 30 relatos da mesma pessoa; uso normal não piora |
| Estresse do banco | `k6/estresse.js` | sobe de 100 até 1.000 requisições/s por degraus de 1 min | não é pass/fail: a tabela por degrau mostra a capacidade |
| Banco fora | `k6/banco-fora.js` | derruba o banco por 100 s enquanto 100 pessoas navegam | páginas públicas seguem 200; `/api/health?db=1` acusa 503 e volta a 200 |

## Como funciona o ambiente

- **Site:** o Next.js compilado em modo produção (`next start`), rodando no seu computador.
- **Banco:** o **mesmo esquema do projeto** (todas as migrations de `supabase/migrations`, com as regras de acesso) num Postgres de contêiner **limitado a 1 CPU e 1 GB**, parecido com o menor plano do Supabase, mais o **PostgREST** (a API que o Supabase usa) com 1.000 pessoas fictícias (15 vagas salvas e 2 trilhas cada, mais artigos, cadastros e relatos antigos).
- **k6:** em contêiner; cada usuário virtual "é" uma pessoa do banco e usa um token (JWT) válido para ela, então a RLS é exercitada de verdade.

## Como rodar

Requisitos: Docker ligado, Node.js e `npm ci` em `apps/web`.

```bash
cd tests/carga
./rodar.sh              # todos os cenários (cerca de 40 minutos)
./rodar.sh publico      # só um cenário
SEED_USUARIOS=5000 ./rodar.sh logada    # simula 5.000 pessoas no banco
MANTER=1 ./rodar.sh abuso               # deixa o ambiente de pé para investigar
```

O resumo de cada cenário fica em `resultados/<cenario>.json` (não vai para o Git). O resultado das execuções oficiais é registrado em
[`docs/teste-de-carga.md`](../../docs/teste-de-carga.md).

## Como ler os resultados

- **Passou/falhou:** o k6 termina com código 0 se todos os limites foram cumpridos e 99 se algum não foi (cada limite aparece com ✓ ou ✗).
- **Capacidade (estresse):** o último degrau com p95 ≤ 300 ms e erros < 0,5% é a taxa que o banco sustenta.

## Limites deste teste (leia antes de confiar nos números)

- **Tudo roda na mesma máquina**: o k6, o site, o Postgres e o PostgREST disputam a mesma CPU. Isso torna o teste **mais duro** do que a realidade para o site, mas o banco é limitado de propósito. Um resultado bom aqui é uma boa evidência; um resultado ruim pode ser a máquina, não o sistema.
- **A Vercel não é testada.** Lá as páginas estáticas vêm da rede de entrega (CDN) e escalam sozinhas; o teste local do `next start` é o pior caso de um servidor só.
- **O Supabase real não é testado**, só o esquema e as regras dele num Postgres parecido. A latência de rede entre a Vercel e o banco (fora do mesmo computador) soma-se ao que for medido aqui.
- O ambiente usa dados fictícios e um segredo de teste; nada disso se conecta a nada real.
