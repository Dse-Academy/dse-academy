# Teste de carga: resultados

Requisito **DESEMP-02** (issue #49). Como rodar e o que cada cenário faz: [`tests/carga/README.md`](../tests/carga/README.md). Metas: [`escala-1000-usuarios.md`](escala-1000-usuarios.md).

## Resumo

| Meta | Resultado | |
|---|---|---|
| Páginas com p95 ≤ 300 ms | **67 ms** com 500 pessoas simultâneas (71 ms com 300 só navegando) | ✅ |
| API com p95 ≤ 300 ms e p99 ≤ 800 ms | **p95 6 ms, p99 9 ms** (150 pessoas logadas no pico); 8,6 ms / 10 ms só com logadas | ✅ |
| Erros 5xx < 0,5% | **0%** em todos os cenários | ✅ |
| 500 pessoas simultâneas sem queda | 8 minutos com 350 sem login + 150 logadas, 0 erros | ✅ |
| Conteúdo público no ar com o banco fora | banco desligado por 100 s: páginas 200 o tempo todo (p95 56 ms); a saúde acusou 503 e voltou a 200 | ✅ |
| Abuso dos formulários barrado | 0 envios anônimos aceitos; uma pessoa só passou 30 de 45 relatos; uso normal não piorou (p95 8 ms) | ✅ |

## Quando e onde rodou

- 17/10/2026, num notebook Windows 11 (Intel i5-13450HX, 16 threads, Docker Desktop com ~8 GB).
- Site: `next build` + `next start` (modo produção), na própria máquina.
- Banco: Postgres 15 limitado a **1 CPU e 1 GB**, com todas as migrations do projeto (001 a 009, com as políticas de RLS) e **1.000 pessoas fictícias** (15.000 vagas salvas, 2.000 inscrições em trilhas, 150 artigos, relatos antigos), atrás do PostgREST e de um gateway nginx.
- Cada pessoa virtual usa um JWT válido para si, então a RLS foi exercitada de verdade em todas as leituras e escritas.

## Resultados por cenário

| Cenário | Carga | Resultado |
|---|---|---|
| Navegação pública | 300 pessoas, ~69 req/s, 21.380 requisições | páginas p95 **71 ms**, mediana 13 ms, máx. 960 ms, 0% de erro |
| Pessoas logadas | 150 pessoas, 8.377 requisições à API | p95 **8,6 ms**, p99 ~10 ms, máx. 49 ms, 0% de erro |
| Pico de divulgação | rampa a 500 em 2 min, platô de 5 min, 73.119 requisições (~146 req/s), 6,6 GB servidos | páginas p95 **67 ms**; API p95 **6,3 ms**; 0% de erro; máx. 443 ms |
| Abuso dos formulários | 50 envios anônimos/s por 2 min + 45 relatos de uma pessoa + 100 pessoas usando | anônimos aceitos: **0**; relatos aceitos 30 / recusados 15; uso normal p95 **8 ms** |
| Banco fora | 100 pessoas por 3 min; banco desligado dos 40 s aos 140 s | páginas p95 **56 ms**, 0% de erro; saúde: 503 em 21 checagens, 200 em 14 |
| Estresse do banco | degraus de 100 a 1.000 leituras/s com RLS | ver abaixo |

### Estresse: onde o banco (1 CPU) satura

Leitura de "vagas salvas" da própria pessoa, com RLS, a taxa constante por 60 s:

| Taxa | p95 | p99 |
|---|---|---|
| 100 req/s | 6 ms | 7 ms |
| 200 req/s | 438 ms | 607 ms |
| 400 req/s | 4,2 s | 6,5 s |
| 600 req/s | 25 s | 27 s |
| 800 e 1.000 req/s | 30 s+ (fila, o banco não acompanha) | |

**Capacidade sustentada neste ambiente: cerca de 100 a 150 leituras/s** (entre o degrau de 100 e o de 200). No pico de 500 pessoas, a comunidade gerou cerca de **35 req/s** à API (o resto são páginas, servidas sem o banco). Há, portanto, **uns 3x de folga** no banco limitado a 1 CPU.

## O que isto significa (e o que não significa)

- Os números sustentam que a **arquitetura e as regras de acesso (RLS) escalam** para a meta de 500 simultâneas, que a proteção contra abuso funciona sob pressão e que o site continua útil sem banco.
- **Não é uma medida da produção.** Tudo roda na mesma máquina (k6, site, banco e API disputam a CPU, o que torna o teste mais duro para o site, mas a rede local é mais rápida que a real). A Vercel (CDN) e o Supabase real (plano gratuito, rede, limites de conexão) **não foram testados e nunca devem receber carga artificial**.
- A latência real soma o trajeto Vercel ↔ Supabase e o do navegador; espere números maiores, mas ainda longe dos limites (a margem é de ~4x nas páginas e ~30x na API).
- O limite de banco (~100 a 150 leituras/s a 1 CPU) é uma referência: o plano gratuito do Supabase tem outra capacidade e conexões compartilhadas. Se a comunidade crescer muito além de 1.000 pessoas ativas ao mesmo tempo, o gargalo previsto é o banco, e o próximo passo é o cache de leituras e o plano pago (ver [`escala-1000-usuarios.md`](escala-1000-usuarios.md)).

## O que o teste revelou no próprio teste

Registrado para não repetir:

1. **Largada em rajada não é uso real.** Na primeira execução do abuso, as 100 pessoas "normais" começaram todas no mesmo milissegundo contra um banco recém-criado e frio, e o p95 delas foi 3,3 s, mesmo sem nenhum abuso. Com entrada gradual (30 s) caiu para 8 ms. Os cenários agora entram em rampa. Vale lembrar que uma rajada de centenas de pessoas no primeiro segundo (um post viral) pode sentir esse efeito de partida a frio; isso não foi medido em produção.
2. **A "chave pública" do banco de teste precisa ser um JWT válido**, como no Supabase; com um texto qualquer, o endpoint de saúde via 401 e acusava falha mesmo com o banco bom. O `rodar.sh` agora gera a chave certa.
3. Os resultados brutos (`tests/carga/resultados/*.json`) ficam só na máquina de quem rodou.

## Como repetir

```bash
cd tests/carga
./rodar.sh            # todos os cenários (cerca de 40 minutos)
```

Ao mudar o banco (novas tabelas, índices, políticas), rode de novo pelo menos `logada`, `abuso` e `estresse` e atualize este documento.
