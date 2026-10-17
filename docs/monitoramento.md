# Monitoramento e alertas

Requisito **DISP-03** (issue #41): saber que o site caiu antes de as pessoas avisarem.

## Camada 1: monitor no GitHub Actions (já funcionando)

O workflow [`Monitor do site`](../.github/workflows/monitor-do-site.yml) roda **a cada 5 minutos** (o mínimo que o GitHub permite) e confere três coisas, com 3 tentativas cada:

| Verificação | Passa quando |
|---|---|
| `/` | responde 200 e contém "DSE Academy" |
| `/vagas` | responde 200 e mostra pelo menos 1 vaga |
| `/api/health?db=1` | responde 200 e `"banco":"ok"` (consulta mínima ao banco; devolve 503 se o banco falhar) |

**O que acontece quando falha:**
1. o job fica vermelho (o GitHub avisa por e-mail quem tem notificações de Actions ligadas);
2. é aberta uma issue com o rótulo `incidente` (quem acompanha o repositório é notificado);
3. quando o site volta, o próprio monitor comenta e **fecha a issue**.

**Limites (importante):** o agendamento do GitHub **atrasa** e não é um SLA. Na prática o alerta chega em uns 5 a 15 minutos. Se o repositório ficar 60 dias sem atividade, o GitHub desativa workflows agendados (o commit semanal de dados mantém o repositório ativo). Também **não avisa se o próprio GitHub estiver fora**.

O endereço monitorado vem da variável do repositório `SITE_URL`. Ao mudar de domínio, atualize-a.

## Camada 2: monitor externo (recomendado, falta criar)

Um monitor fora do GitHub dá um prazo mais firme e funciona mesmo se o GitHub estiver indisponível. Duas opções gratuitas:

### Opção A: UptimeRobot (mais simples)
1. Crie uma conta em uptimerobot.com (plano gratuito: monitores a cada 5 minutos).
2. **Add New Monitor** → tipo **HTTP(s)**.
3. Crie três monitores:
   - `https://dse-academy-chi.vercel.app/` (nome: "DSE Academy: home")
   - `https://dse-academy-chi.vercel.app/vagas` (nome: "DSE Academy: vagas")
   - `https://dse-academy-chi.vercel.app/api/health?db=1` (nome: "DSE Academy: banco") com **Keyword monitoring** procurando `"banco":"ok"`.
4. Em **Alert contacts**, adicione o e-mail da equipe (academydserec@gmail.com) e uma segunda pessoa.
5. Intervalo: 5 minutos.

### Opção B: Uptime Kuma (código aberto, hospedado por vocês)
Alternativa 100% aberta, mas exige um servidor sempre ligado (ver `docs/escala-1000-usuarios.md`, fase 2). Mesmas três verificações e os mesmos contatos de alerta.

**Cuidado com a consulta ao banco:** `/api/health?db=1` toca o banco a cada chamada. Mantenha intervalo de **5 minutos ou mais**, nunca de segundos.

## Quando chega um alerta

1. Abra o site e veja qual verificação falhou (a issue do incidente diz em qual: `/`, `/vagas` ou `/api/health(banco)`).
2. **Só o banco falhou** → veja o status do Supabase e o projeto no painel; se estiver pausado, *Restore project* (a rotina anti-pausa roda todo dia e avisa se o banco não responder).
3. **Site inteiro fora** → painel da Vercel, aba *Deployments*: houve deploy com erro? Faça *rollback* para o último deploy bom.
4. **Conteúdo estranho** (a home abre, mas sem vagas) → conferir `apps/web/data/` e o último commit de dados do workflow `Coleta e publicação`.
5. Registre o que houve na própria issue do incidente (ela fecha sozinha quando o site volta, mas o comentário fica como histórico).
