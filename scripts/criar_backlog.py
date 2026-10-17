"""Cria no GitHub o backlog de produtização: rótulos, marcos, uma issue por requisito e uma issue-roteiro com a ordem.

Fonte dos requisitos: docs/requisitos-produto.md (ID, tipo, prioridade, evidência, critério de aceite, estado).
Este script acrescenta o que não está lá: título curto, ordem de execução, tarefas, dependências e pré-requisitos externos.

Uso (precisa do GitHub CLI autenticado com permissão no repositório):
    python scripts/criar_backlog.py --repo dono/repositorio            # simula e mostra o que criaria
    python scripts/criar_backlog.py --repo dono/repositorio --criar    # cria de verdade

É idempotente: não recria rótulo, marco nem issue que já exista (a issue é reconhecida pelo ID no título).
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DOC = RAIZ / "docs" / "requisitos-produto.md"

# --- Ordem de execução (1 = primeiro). P0 primeiro, depois P1, depois P2. Dentro de cada prioridade, na ordem em que devem ser feitos. ---
ORDEM = [
    # P0: o que bloqueia a divulgação. Começa pelo que é rápido e barato, e dispara cedo o que depende de pessoas.
    "SEG-09", "SEG-05", "OPS-03", "PROD-05", "SEG-03", "DESEMP-01", "SEG-01", "DISP-01", "SEG-10", "DISP-02",
    "DISP-03", "PRIV-01", "PRIV-03", "SEG-04", "OPS-01", "OPS-02", "PROD-02", "PROD-06", "DESEMP-02", "SEG-11",
    # P1: até 30 dias depois
    "DISP-06", "DISP-04", "PROD-01", "SEG-07", "SEG-08", "QA-02", "DISP-08", "DISP-07", "OPS-06", "OPS-05",
    "PRIV-02", "PRIV-04", "PRIV-06", "PRIV-07", "SEG-06", "SEG-02", "DESEMP-03", "DESEMP-04", "DISP-05", "QA-01",
    "QA-03", "PROD-03", "PROD-04", "SEG-12",
    # P2: quando houver capacidade
    "PRIV-05", "DESEMP-05", "QA-04", "OPS-04", "OPS-07",
]

TITULOS = {
    "SEG-01": "Cabeçalhos de segurança no site",
    "SEG-02": "Content-Security-Policy (Report-Only e depois imposta)",
    "SEG-03": "Exigir login e limitar envios nos formulários",
    "SEG-04": "Proteger o login (limites do Auth, Redirect URLs, app do Google publicado)",
    "SEG-05": "Rotacionar segredos expostos e definir política de rotação",
    "SEG-06": "MFA para admins e trilha de auditoria das ações administrativas",
    "SEG-07": "Testes automatizados das políticas RLS no CI",
    "SEG-08": "Dependabot, auditoria de dependências e CodeQL",
    "SEG-09": "Proteger a branch main (PR + CI verde, sem force-push)",
    "SEG-10": "Backup cifrado (repositório é público)",
    "SEG-11": "Conteúdo de formulários sempre como texto (manter testes)",
    "SEG-12": "Segredos fora do repositório e varredura ativa (manter)",
    "PRIV-01": "Página de Política de Privacidade",
    "PRIV-02": "Termos de Uso e aviso do que fica no navegador",
    "PRIV-03": "Registrar a versão do consentimento nos formulários",
    "PRIV-04": "Exportar meus dados (portabilidade) além de excluir a conta",
    "PRIV-05": "Política e rotina de retenção de dados",
    "PRIV-06": "Logs e métricas sem dados pessoais",
    "PRIV-07": "Analytics que respeita a privacidade (sem cookies)",
    "DISP-01": "Rotina anti-pausa do banco",
    "DISP-02": "Backup diário e teste de restauração mensal",
    "DISP-03": "Monitoramento com alerta de indisponibilidade",
    "DISP-04": "Endpoints de saúde (/api/health e /health)",
    "DISP-05": "Degradação graciosa quando o banco falha",
    "DISP-06": "Páginas de erro próprias (404, erro, erro global)",
    "DISP-07": "Plano de recuperação (runbook) com RPO e RTO",
    "DISP-08": "Deploy seguro: rollback e migrations registradas",
    "DESEMP-01": "Aplicar a migration 009 (RLS otimizada e índices)",
    "DESEMP-02": "Teste de carga com k6 antes da divulgação",
    "DESEMP-03": "Uma chamada ao banco por carga de página logada",
    "DESEMP-04": "Medir Web Vitals (LCP, INP, CLS) no CI",
    "DESEMP-05": "Paginação e totais eficientes no admin",
    "QA-01": "Testes de ponta a ponta (Playwright) dos fluxos críticos",
    "QA-02": "Ambiente de homologação separado",
    "QA-03": "Acessibilidade automatizada (axe) no CI",
    "QA-04": "Monitoramento de erros no front",
    "PROD-01": "SEO: robots, sitemap, canonical, Open Graph e dados de vaga",
    "PROD-02": "Verificar termos de uso e robots.txt da Gupy (e plano B)",
    "PROD-03": "Canal para empresas pedirem remoção ou correção de vaga",
    "PROD-04": "Alerta de coleta vazia e último conjunto de dados sempre no ar",
    "PROD-05": "Licença de código aberto e documentos da comunidade",
    "PROD-06": "Confirmar autorização de uso das imagens da equipe e dos eventos",
    "OPS-01": "Domínio próprio da DSE",
    "OPS-02": "SMTP próprio com SPF, DKIM e DMARC",
    "OPS-03": "Infraestrutura em contas da organização com 2+ responsáveis e MFA",
    "OPS-04": "Fila no banco e worker próprio para avisos e Agenda",
    "OPS-05": "Monitorar cotas gratuitas com alerta a 70%",
    "OPS-06": "Runbooks e canal de incidente",
    "OPS-07": "Orçamento de contingência (plano B pago) com gatilho de uso",
}

# --- Tarefas de cada requisito (checklist da issue) ---
TAREFAS = {
    "SEG-01": [
        "Adicionar `headers()` em `apps/web/next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` / `frame-ancestors`",
        "Teste no CI que falha se algum cabeçalho sumir",
        "Conferir a nota em um scanner de cabeçalhos depois do deploy",
    ],
    "SEG-02": [
        "Trocar o script de tema inline por um com nonce (ou arquivo externo)",
        "Publicar CSP em modo `Report-Only` e coletar violações por 1 semana",
        "Impor a CSP depois de zerar as violações",
    ],
    "SEG-03": [
        "Componente `ExigirLogin` e uso nos formulários de artigo, palestrante e relato (visitante vê o login)",
        "Mensagem amigável quando o limite de envios é atingido (erro do banco `limite de envios atingido`)",
        "Publicar o site com o login obrigatório ANTES de aplicar a migration 009",
        "Aplicar a migration 009 no Supabase e conferir que anônimo é recusado",
        "(opcional) Desafio anti-robô aberto no login, se aparecer abuso de cadastros",
        "Cenário de abuso no teste de carga (DESEMP-02)",
    ],
    "SEG-04": [
        "Revisar os limites de taxa do Supabase Auth (e-mails por hora, tentativas)",
        "Restringir as Redirect URLs ao domínio de produção e ao localhost de testes",
        "Publicar o app no Google Cloud (sair do modo Teste)",
        "Teste: 20 pedidos de login em 1 minuto são limitados",
    ],
    "SEG-05": [
        "Trocar o token do webhook (propriedade `TOKEN` do Apps Script e URL no SQL do Supabase)",
        "Gerar nova `GROQ_API_KEY`, revogar a antiga e atualizar `.env` e o secret do GitHub",
        "Revisar o Client Secret do Google (adicionar novo e remover o antigo)",
        "Documentar o procedimento de rotação e a periodicidade (ex.: a cada 6 meses)",
    ],
    "SEG-06": [
        "Ativar MFA (TOTP) no Supabase e exigir para `/admin`",
        "Tabela `auditoria_admin` e triggers nas ações de moderação (artigos, palestrantes)",
        "Aba de auditoria no painel (somente leitura)",
    ],
    "SEG-07": [
        "Rodar `tests/banco/validar-migrations.mjs` no CI (job novo, com `@electric-sql/pglite`)",
        "Cobrir as demais tabelas: perfis, vagas salvas, inscrições e funções do admin",
        "Falhar o CI se alguém ler dado de outra pessoa",
    ],
    "SEG-08": [
        "Ativar Dependabot (npm, pip, GitHub Actions)",
        "Ativar CodeQL para JavaScript/TypeScript e Python",
        "Adicionar `npm audit` e `pip-audit` ao CI",
    ],
    "SEG-09": [
        "Regra de proteção da `main`: PR obrigatório, checks `api`, `web` e `apps-script` obrigatórios",
        "Bloquear force-push e exclusão da branch",
        "Liberar exceção documentada só para o commit automático do workflow de dados, se necessário",
    ],
    "SEG-10": [
        "Gerar o dump com `pg_dump` via conexão do pooler (IPv4)",
        "Cifrar com senha (`BACKUP_PASSPHRASE`, secret do GitHub) antes de guardar",
        "Guardar fora de qualquer lugar público (artefato privado não é possível em repo público: usar armazenamento S3-compatível ou release privado)",
        "Teste: o arquivo não abre sem a senha",
    ],
    "SEG-11": [
        "Manter os testes que enviam `<script>` nos campos e confirmam texto puro",
    ],
    "SEG-12": [
        "Manter secret scanning e push protection ativos",
        "Revisão trimestral de segredos e acessos",
    ],
    "PRIV-01": [
        "Redigir a política (dados tratados, finalidade, base legal, compartilhamento com Supabase, Vercel, Google e Groq, retenção, direitos, contato do encarregado)",
        "Criar a rota `/privacidade` e linkar no rodapé, no login e nos formulários",
        "Revisão jurídica antes de publicar",
        "Definir o responsável legal e o encarregado (DPO)",
    ],
    "PRIV-02": [
        "Redigir os Termos de Uso",
        "Aviso sobre o que fica no navegador (tema e sessão de login)",
        "Criar as páginas e linkar no rodapé",
    ],
    "PRIV-03": [
        "Coluna `versao_politica` nas tabelas de envio (migration nova)",
        "Gravar a versão vigente da política em cada envio",
        "Atualizar o painel de admin para exibir a versão aceita",
    ],
    "PRIV-04": [
        "Função no banco que devolve os dados da pessoa (perfil, vagas salvas, inscrições, envios)",
        "Botão \"Baixar meus dados\" (JSON) em Meu perfil",
        "Teste: a pessoa só recebe os próprios dados",
    ],
    "PRIV-05": [
        "Definir prazos de retenção (envios recusados, relatos antigos, logs)",
        "Rotina agendada que apaga após o prazo",
        "Documentar na política de privacidade",
    ],
    "PRIV-06": [
        "Revisar o que os logs do site, do Apps Script e do painel registram",
        "Remover e-mails e conteúdo de formulário dos logs",
    ],
    "PRIV-07": [
        "Escolher a ferramenta aberta (Umami ou Plausible) e onde hospedar",
        "Instalar sem cookies e respeitando \"Do Not Track\"",
        "Documentar na política de privacidade",
    ],
    "DISP-01": [
        "Workflow agendado a cada 2 dias que faz uma consulta simples ao banco (view pública)",
        "Alerta se a consulta falhar (o GitHub avisa por e-mail)",
    ],
    "DISP-02": [
        "Workflow de backup (diário ou semanal) usando o dump cifrado de SEG-10",
        "Procedimento de restauração documentado",
        "Teste de restauração em máquina limpa, medindo o tempo (RTO)",
        "Agendar o teste de restauração mensal",
    ],
    "DISP-03": [
        "Monitor externo (Uptime Kuma ou UptimeRobot) em `/`, `/vagas` e `/api/health`",
        "Alerta por e-mail para a equipe em até 10 minutos",
        "Verificação agendada no GitHub Actions como segunda camada",
    ],
    "DISP-04": [
        "Criar `apps/web/src/app/api/health/route.ts` (status e versão, sem dados sensíveis)",
        "Garantir que a API `/health` continua funcionando",
        "Apontar o monitor (DISP-03) para os dois",
    ],
    "DISP-05": [
        "Teste com o banco indisponível: vagas e trilhas continuam abrindo",
        "Mensagens claras nas áreas logadas quando o banco não responde",
        "Timeouts nas chamadas ao Supabase",
    ],
    "DISP-06": [
        "Criar `not-found.tsx`, `error.tsx` e `global-error.tsx` no padrão visual do site",
        "Link de volta ao início e aos contatos",
    ],
    "DISP-07": [
        "Escrever o runbook: banco fora, site fora, segredo vazado, restauração de backup",
        "Registrar RPO e RTO acordados",
        "Ensaiar um cenário e ajustar o documento",
    ],
    "DISP-08": [
        "Adotar a CLI do Supabase para aplicar migrations com histórico",
        "Documentar o rollback do front (Vercel) e do banco",
        "Checklist de deploy no PR",
    ],
    "DESEMP-01": [
        "Confirmar que o site com login obrigatório (SEG-03) já está publicado",
        "Rodar `009_robustez.sql` no SQL Editor do Supabase",
        "Rodar a consulta de validação e conferir políticas e índices",
    ],
    "DESEMP-02": [
        "Cenários k6 em `tests/carga/`: navegação pública, pessoa logada, pico de divulgação, abuso de formulários, banco fora",
        "Rodar em um ambiente separado de produção (idealmente a homologação do QA-02; antes dela, um projeto Supabase temporário), nunca em produção",
        "Registrar os resultados e ajustar até passar: p95 ≤ 300 ms e 5xx < 0,5%",
    ],
    "DESEMP-03": [
        "Função `minha_conta()` que devolve perfil, vagas salvas, inscrições e `is_admin` de uma vez",
        "Trocar as chamadas separadas do provedor de conta por essa função",
        "Medir a redução de chamadas por página",
    ],
    "DESEMP-04": [
        "Lighthouse CI com orçamentos mínimos (LCP, INP, CLS)",
        "Corrigir as páginas que ficarem abaixo",
    ],
    "DESEMP-05": [
        "Paginação nas listas de artigos, palestrantes e relatos",
        "Avaliar visão materializada para os totais quando passar de ~5 mil pessoas",
    ],
    "QA-01": [
        "Configurar o Playwright no CI",
        "Fluxos: login (conta de teste), salvar vaga, progresso de trilha, envio de formulário",
        "Rodar contra o ambiente de homologação (QA-02)",
    ],
    "QA-02": [
        "Criar um segundo projeto Supabase gratuito para homologação",
        "Aplicar as migrations e dados de teste",
        "Apontar as prévias (preview) da Vercel para ele",
    ],
    "QA-03": [
        "Rodar o axe nas telas principais no CI",
        "Zerar violações sérias",
    ],
    "QA-04": [
        "Escolher a ferramenta aberta (ex.: GlitchTip) e instalar no front",
        "Alerta de erros novos",
    ],
    "PROD-01": [
        "Criar `robots.ts` e `sitemap.ts` (vagas e trilhas)",
        "Canonical, Open Graph e Twitter cards",
        "Dados estruturados `JobPosting` nas vagas, se os termos da fonte permitirem (PROD-02)",
    ],
    "PROD-02": [
        "Ler os termos de uso e o `robots.txt` da Gupy e registrar a conclusão",
        "Se restringir, ativar o plano B: exibir só título, empresa, tecnologias e link",
        "Atualizar a seção \"Fonte dos dados\" do README",
    ],
    "PROD-03": [
        "E-mail ou formulário para empresas pedirem remoção ou correção",
        "Prazo de resposta e procedimento para ocultar uma vaga",
        "Link no rodapé e na página da vaga",
    ],
    "PROD-04": [
        "Alerta quando a coleta vier vazia ou abaixo do mínimo",
        "Garantir que o último conjunto de dados continua no ar nesse caso",
        "Conferir o endereço da Gupy toda semana (ele já mudou uma vez)",
    ],
    "PROD-05": [
        "Escolher a licença de código aberto (ex.: MIT ou Apache-2.0, ou AGPL se quiser proteger contra uso fechado)",
        "Adicionar `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md` (divulgação responsável) e `CODE_OF_CONDUCT.md`",
        "Atualizar o README e o `package.json`",
    ],
    "PROD-06": [
        "Pedir a autorização de uso de imagem de cada pessoa das fotos (equipe e eventos)",
        "Registrar as autorizações",
        "Remover do site as fotos sem autorização",
        "Confirmar a ordem nome e foto das lideranças",
    ],
    "OPS-01": [
        "Escolher e registrar o domínio no nome da organização",
        "Apontar o domínio para a Vercel",
        "Atualizar a Site URL e as Redirect URLs do Supabase e os URIs do Google OAuth",
    ],
    "OPS-02": [
        "Escolher o relay SMTP e configurar no Supabase (Authentication, Emails)",
        "Configurar SPF, DKIM e DMARC no domínio",
        "Teste: 100 pedidos de login em sequência chegam sem cair em spam",
    ],
    "OPS-03": [
        "Criar a organização no GitHub, Vercel, Supabase e Google Cloud e transferir os projetos",
        "Pelo menos 2 pessoas com acesso de administrador em cada serviço",
        "MFA obrigatório em todas as contas",
        "Registrar quem tem acesso a quê",
    ],
    "OPS-04": [
        "Tabela `outbox` no banco e função que enfileira avisos",
        "Worker (Python) que envia e-mail e cria o evento, com reenvio em caso de falha",
        "Aposentar o webhook do Apps Script",
    ],
    "OPS-05": [
        "Acompanhar usuários ativos, tamanho do banco e banda",
        "Alerta a 70% de qualquer cota",
    ],
    "OPS-06": [
        "Canal de incidente e quem responde",
        "Runbooks curtos por tipo de incidente (ligado ao DISP-07)",
    ],
    "OPS-07": [
        "Definir o plano B pago (por exemplo, Supabase Pro) e quem aprova",
        "Gatilho de uso: ao chegar em 70% da cota ou ao primeiro incidente de disponibilidade",
    ],
}

# Requisitos que dependem de decisão ou de ação de pessoas fora do código
EXTERNO = {
    "OPS-01": "Decisão e pagamento do domínio (um domínio custa pouco por ano; sem orçamento, avaliar subdomínio gratuito de uma instituição parceira).",
    "OPS-02": "Escolha do relay SMTP e acesso ao DNS do domínio.",
    "OPS-03": "Pessoas responsáveis e criação das organizações.",
    "PRIV-01": "Revisão jurídica e definição do responsável legal e do encarregado.",
    "PROD-02": "Leitura e decisão da equipe sobre os termos da Gupy.",
    "PROD-05": "Escolha da licença pela comunidade.",
    "PROD-06": "Autorização das pessoas que aparecem nas imagens.",
    "SEG-04": "Publicar o app no Google Cloud exige a conta dona do projeto.",
    "SEG-05": "Acesso às contas do Google, do Groq e do Supabase.",
    "OPS-07": "Decisão de orçamento da comunidade.",
}

# Requisito -> requisitos que precisam estar prontos antes
DEPENDE = {
    "DESEMP-01": ["SEG-03"],
    "DISP-02": ["SEG-10"],
    "DISP-04": ["DISP-03"],
    "OPS-02": ["OPS-01"],
    "DESEMP-02": ["SEG-03", "DESEMP-01", "SEG-01"],
    "SEG-07": ["DESEMP-01"],
    "QA-01": ["QA-02"],
    "PRIV-03": ["PRIV-01"],
    "PRIV-04": ["PRIV-01"],
    "PRIV-05": ["PRIV-01"],
    "PRIV-07": ["PRIV-01"],
    "PROD-01": ["PROD-02"],
    "DISP-07": ["DISP-02"],
    "OPS-06": ["DISP-07"],
    "SEG-02": ["SEG-01"],
}

AREAS = {"SEG": "segurança", "PRIV": "privacidade", "DISP": "disponibilidade", "DESEMP": "desempenho",
         "QA": "qualidade", "PROD": "produto", "OPS": "operação"}
COR_AREA = {"segurança": "b60205", "privacidade": "5319e7", "disponibilidade": "0e8a16", "desempenho": "fbca04",
            "qualidade": "1d76db", "produto": "0052cc", "operação": "6f42c1"}
ROTULOS_FIXOS = {
    "requisito": ("0366d6", "Requisito do catálogo de produtização"),
    "P0 · bloqueia a divulgação": ("b60205", "Precisa estar pronto antes de abrir o site à comunidade"),
    "P1 · até 30 dias": ("d93f0b", "Até 30 dias depois da divulgação"),
    "P2 · quando houver capacidade": ("fbca04", "Quando houver capacidade"),
    "tipo: criar": ("0e8a16", "Não existe e precisa ser criado"),
    "tipo: corrigir": ("d73a4a", "Existe e está errado ou arriscado"),
    "tipo: aperfeiçoar": ("1d76db", "Existe e precisa melhorar"),
    "depende de pessoas": ("c5def5", "Depende de decisão ou ação de pessoas fora do código"),
}
MARCOS = {
    "P0": ("Fase 0 · Antes de divulgar (P0)", "Requisitos que bloqueiam a divulgação aberta à comunidade."),
    "P1": ("Fase 1 · Até 30 dias (P1)", "Requisitos para os primeiros 30 dias depois da divulgação."),
    "P2": ("Fase 2 · Quando houver capacidade (P2)", "Melhorias de médio prazo."),
}
ROTULO_PRI = {"P0": "P0 · bloqueia a divulgação", "P1": "P1 · até 30 dias", "P2": "P2 · quando houver capacidade"}
ROTULO_TIPO = {"CRIAR": "tipo: criar", "CORRIGIR": "tipo: corrigir", "APERFEIÇOAR": "tipo: aperfeiçoar"}


def gh(*args: str, entrada: str | None = None) -> str:
    r = subprocess.run(["gh", *args], capture_output=True, text=True, encoding="utf-8", input=entrada)
    if r.returncode != 0:
        raise RuntimeError(f"gh {' '.join(args[:3])} falhou: {r.stderr.strip()}")
    return r.stdout


def ler_requisitos() -> dict[str, dict]:
    texto = DOC.read_text(encoding="utf-8")
    pad = re.compile(r"^\| ((?:SEG|PRIV|DISP|DESEMP|QA|PROD|OPS)-\d+) \| (.*?) \| (CRIAR|CORRIGIR|APERFEIÇOAR) \| (P[012]) \| (.*?) \| (.*?) \| (.*?) \|\s*$", re.M)
    reqs = {}
    for id_, texto_req, tipo, pri, evid, aceite, estado in pad.findall(texto):
        reqs[id_] = {"id": id_, "texto": texto_req, "tipo": tipo, "pri": pri, "evidencia": evid, "aceite": aceite, "estado": estado}
    return reqs


def validar(reqs: dict[str, dict]) -> None:
    ids = set(reqs)
    problemas = []
    if set(ORDEM) != ids or len(ORDEM) != len(set(ORDEM)):
        problemas.append(f"ORDEM não bate com o documento: faltam {sorted(ids - set(ORDEM))}, sobram {sorted(set(ORDEM) - ids)}")
    for nome, d in (("TITULOS", TITULOS), ("TAREFAS", TAREFAS)):
        if set(d) != ids:
            problemas.append(f"{nome} não bate com o documento: faltam {sorted(ids - set(d))}, sobram {sorted(set(d) - ids)}")
    # a ordem tem que respeitar a prioridade e as dependências
    posicao = {i: n for n, i in enumerate(ORDEM)}
    peso = {"P0": 0, "P1": 1, "P2": 2}
    ordenado = sorted(ORDEM, key=lambda i: (peso[reqs[i]["pri"]], posicao[i])) if ids == set(ORDEM) else []
    if ordenado and ordenado != ORDEM:
        problemas.append("ORDEM mistura prioridades: P0 deve vir antes de P1 e P2")
    for i, deps in DEPENDE.items():
        for d in deps:
            if d in posicao and i in posicao:
                if peso[reqs[d]["pri"]] > peso[reqs[i]["pri"]]:
                    problemas.append(f"{i} (prioridade maior) depende de {d}, que tem prioridade menor")
                if posicao[d] > posicao[i]:
                    problemas.append(f"{i} aparece antes de {d} na ordem, mas depende dele")
    if problemas:
        sys.exit("Inconsistências:\n- " + "\n- ".join(problemas))


def corpo(req: dict, ordem: int, total: int, numeros: dict[str, int] | None = None) -> str:
    i = req["id"]
    linhas = [
        f"**Requisito {i}.** {req['texto']}",
        "",
        f"| Tipo | Prioridade | Ordem de execução | Área |",
        f"|---|---|---|---|",
        f"| {req['tipo'].lower()} | {req['pri']} | {ordem} de {total} | {AREAS[i.split('-')[0]]} |",
        "",
        "### Situação hoje",
        req["evidencia"],
        "",
        f"**Estado:** {req['estado']}",
        "",
        "### Critério de aceite",
        req["aceite"],
        "",
        "### Tarefas",
        *[f"- [ ] {t}" for t in TAREFAS[i]],
    ]
    deps = DEPENDE.get(i, [])
    if deps:
        refs = [f"#{numeros[d]} ({d})" if numeros and d in numeros else d for d in deps]
        linhas += ["", "### Depende de", *[f"- {r}" for r in refs]]
    if i in EXTERNO:
        linhas += ["", "### Pré-requisito fora do código", EXTERNO[i]]
    linhas += ["", "---", "Fonte: [docs/requisitos-produto.md](../blob/main/docs/requisitos-produto.md). Plano de escala: [docs/escala-1000-usuarios.md](../blob/main/docs/escala-1000-usuarios.md)."]
    return "\n".join(linhas)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--criar", action="store_true", help="cria de verdade (sem isso, só mostra o plano)")
    args = ap.parse_args()

    reqs = ler_requisitos()
    validar(reqs)
    total = len(ORDEM)
    print(f"{total} requisitos: " + ", ".join(f"{p}={sum(1 for r in reqs.values() if r['pri'] == p)}" for p in ("P0", "P1", "P2")))
    if not args.criar:
        for n, i in enumerate(ORDEM, 1):
            print(f"{n:>2}. [{reqs[i]['pri']}] {i:<10} {TITULOS[i]}  ({len(TAREFAS[i])} tarefas)")
        print("\nSimulação. Rode com --criar para criar no GitHub.")
        return

    repo = args.repo
    # rótulos
    existentes = {r["name"] for r in json.loads(gh("label", "list", "--repo", repo, "--limit", "200", "--json", "name"))}
    todos = dict(ROTULOS_FIXOS)
    for nome, cor in COR_AREA.items():
        todos[f"área: {nome}"] = (cor, f"Área: {nome}")
    for nome, (cor, desc) in todos.items():
        if nome not in existentes:
            gh("label", "create", nome, "--repo", repo, "--color", cor, "--description", desc)
            print("rótulo criado:", nome)
    # marcos
    marcos_existentes = {m["title"]: m["number"] for m in json.loads(gh("api", f"repos/{repo}/milestones?state=all&per_page=100"))}
    for pri, (titulo, desc) in MARCOS.items():
        if titulo not in marcos_existentes:
            gh("api", f"repos/{repo}/milestones", "-f", f"title={titulo}", "-f", f"description={desc}")
            print("marco criado:", titulo)

    # issues, na ordem de execução
    ja = {}
    for it in json.loads(gh("issue", "list", "--repo", repo, "--state", "all", "--limit", "500", "--json", "number,title")):
        m = re.match(r"\[((?:SEG|PRIV|DISP|DESEMP|QA|PROD|OPS)-\d+)\]", it["title"])
        if m:
            ja[m.group(1)] = it["number"]
    numeros = dict(ja)
    for n, i in enumerate(ORDEM, 1):
        if i in numeros:
            continue
        r = reqs[i]
        rotulos = ["requisito", ROTULO_PRI[r["pri"]], ROTULO_TIPO[r["tipo"]], f"área: {AREAS[i.split('-')[0]]}"]
        if i in EXTERNO:
            rotulos.append("depende de pessoas")
        titulo = f"[{i}] {TITULOS[i]}"
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(corpo(r, n, total))
            caminho = f.name
        cmd = ["issue", "create", "--repo", repo, "--title", titulo, "--body-file", caminho, "--milestone", MARCOS[r["pri"]][0]]
        for rot in rotulos:
            cmd += ["--label", rot]
        url = gh(*cmd).strip()
        numeros[i] = int(url.rsplit("/", 1)[1])
        print(f"#{numeros[i]:<3} {titulo}")

    # segunda passada: dependências com os números reais das issues
    for i, deps in DEPENDE.items():
        n = ORDEM.index(i) + 1
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(corpo(reqs[i], n, total, numeros))
            caminho = f.name
        gh("issue", "edit", str(numeros[i]), "--repo", repo, "--body-file", caminho)

    # issue-roteiro com a ordem e as caixas de seleção (o GitHub mostra o progresso)
    titulo_roteiro = "Roteiro de produtização: ordem de execução"
    if not any(it["title"] == titulo_roteiro for it in json.loads(gh("issue", "list", "--repo", repo, "--state", "all", "--limit", "500", "--json", "title"))):
        partes = ["Ordem em que os requisitos devem ser feitos. Marque as caixas pelas issues; o GitHub mostra o progresso.", ""]
        atual = None
        for n, i in enumerate(ORDEM, 1):
            p = reqs[i]["pri"]
            if p != atual:
                atual = p
                partes += ["", f"## {MARCOS[p][0]}", ""]
            ext = " · depende de pessoas" if i in EXTERNO else ""
            feito = "x" if reqs[i]["estado"].startswith("feito") else " "
            partes.append(f"- [{feito}] {n}. #{numeros[i]} **{i}** {TITULOS[i]}{ext}")
        partes += ["", "Detalhes: [docs/requisitos-produto.md](../blob/main/docs/requisitos-produto.md) e [docs/escala-1000-usuarios.md](../blob/main/docs/escala-1000-usuarios.md)."]
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write("\n".join(partes))
            caminho = f.name
        url = gh("issue", "create", "--repo", repo, "--title", titulo_roteiro, "--body-file", caminho, "--label", "requisito").strip()
        print("roteiro:", url)

    # os que já estão atendidos são fechados com um comentário
    for i in ORDEM:
        if reqs[i]["estado"].startswith("feito") and i not in ja:
            gh("issue", "close", str(numeros[i]), "--repo", repo, "--comment", "Já atendido; a issue fica como registro. Manter os testes e as verificações.")

    (RAIZ / "docs" / "backlog.json").write_text(json.dumps({"ordem": ORDEM, "issues": numeros}, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nFeito. Mapa ID -> issue em docs/backlog.json")


if __name__ == "__main__":
    main()
