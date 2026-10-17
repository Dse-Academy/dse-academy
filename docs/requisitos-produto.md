# Requisitos para transformar a POC em produto (DSE Academy)

Catálogo de requisitos para abrir o site a toda a comunidade com **segurança, robustez e conformidade**, sem orçamento de infraestrutura.
Complementa [escala-1000-usuarios.md](escala-1000-usuarios.md) (carga, arquitetura e fases).
O backlog executável (uma issue por requisito, com tarefas, ordem e marcos) está no [roteiro #80](https://github.com/Dse-Academy/dse-academy/issues/80).

**Como ler**

- **Tipo:** `CORRIGIR` (existe e está errado ou arriscado), `APERFEIÇOAR` (existe, precisa melhorar), `CRIAR` (não existe).
- **Prioridade:** **P0** bloqueia a divulgação aberta; **P1** até 30 dias depois; **P2** quando houver capacidade.
- **Evidência:** o que foi observado no site publicado (`dse-academy-chi.vercel.app`) ou no repositório em outubro de 2026.
- **Estado:** `feito`, `pronto, falta aplicar`, `pendente`.

Resumo: **49 requisitos**, dos quais **20 são P0**.

---

## 1. Segurança da aplicação

| ID | Requisito | Tipo | Pri. | Evidência | Critério de aceite | Estado |
|---|---|---|---|---|---|---|
| SEG-01 | O site deve enviar cabeçalhos de segurança (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`/`frame-ancestors`) | CRIAR | P0 | a home só devolve `Strict-Transport-Security` | scanner de cabeçalhos com nota A; teste automatizado no CI | pendente |
| SEG-02 | O site deve ter Content-Security-Policy (iniciar em modo `Report-Only`, depois impor) | CRIAR | P1 | não há CSP; o script de tema é inline e precisa de nonce | CSP imposta sem erros no console nas telas principais | pendente |
| SEG-03 | Os formulários (artigo, palestrante e relato) devem **exigir login** e ter limite de envios por pessoa | CRIAR | P0 | hoje qualquer pessoa, logada ou não, insere sem limite | visitante vê o login em vez do formulário; o banco recusa `anon`; o 6º artigo em 24 h da mesma pessoa é recusado; teste de abuso no k6 passa | migration 009 validada em Postgres local (**falta aplicar**, depois de publicar a tela com login); tela com login pendente |
| SEG-04 | O login deve ter proteção contra abuso: limites do Supabase Auth revisados, confirmação de e-mail, Redirect URLs sem curingas desnecessários, app do Google publicado | APERFEIÇOAR | P0 | confirmação ligada; app do Google em modo teste | tentativa de 20 logins/min é limitada; só URLs da lista funcionam | parcial |
| SEG-05 | Segredos expostos devem ser rotacionados e haver política de rotação | CORRIGIR | P0 | token do Apps Script e outros apareceram em conversa | tokens novos em uso; antigos revogados; procedimento documentado | procedimento e varredura prontos; troca dos segredos expostos **dispensada por decisão da liderança (risco aceito, reavaliar em 17/04/2027)**; política de rotação segue valendo |
| SEG-06 | Contas de admin devem ter MFA e toda ação administrativa deve ser registrada (quem, o quê, quando) | CRIAR | P1 | admin só por e-mail/Google; sem trilha de auditoria | TOTP obrigatório para `/admin`; tabela `auditoria_admin` preenchida por trigger | pendente |
| SEG-07 | As políticas RLS devem ter testes automatizados que falham o CI se alguém ler dado de outra pessoa | CRIAR | P1 | sem teste de banco no CI | cenários "A não vê B", "anônimo não lê", "limites" rodam no CI | script validado localmente, **falta ligar no CI** |
| SEG-08 | Dependências devem ser verificadas continuamente (Dependabot, auditoria de npm/pip, CodeQL) | CRIAR | P1 | `npm audit` limpo hoje; Dependabot desativado | alertas e PRs automáticos ativos | pendente |
| SEG-09 | A branch `main` deve exigir PR, CI verde e proibir força-push | CRIAR | P0 | `main` sem proteção | regra ativa no GitHub | feito: ruleset "Proteger main" ativo (PR + checks api, web e apps-script; sem force-push e sem exclusão); exceção só para a deploy key `workflow-dados` |
| SEG-10 | Backups não podem ficar legíveis em repositório público: devem ser cifrados antes de sair do banco | CRIAR | P0 | repositório é público; artefatos de Actions seriam legíveis | arquivo de backup só abre com a senha; senha fora do repositório | pendente |
| SEG-11 | Conteúdo de formulários deve ser tratado como texto (sem HTML) em todo lugar | APERFEIÇOAR | P0 | React escapa; Apps Script envia texto puro; URLs `https` exigidas no banco | teste com `<script>` em todos os campos não executa nada | feito (manter testes) |
| SEG-12 | Segredos nunca no repositório; varredura ativa | APERFEIÇOAR | P1 | `.env` ignorado; secret scanning e push protection ativos | mantidos; revisão trimestral | feito |

## 2. Privacidade e LGPD

| ID | Requisito | Tipo | Pri. | Evidência | Critério de aceite | Estado |
|---|---|---|---|---|---|---|
| PRIV-01 | Deve existir página de **Política de Privacidade** (dados tratados, finalidade, base legal, compartilhamento, retenção, direitos, contato do encarregado) | CRIAR | P0 | `/privacidade` retorna 404 | página no ar, linkada no rodapé, login e formulários; revisada juridicamente | pendente |
| PRIV-02 | Deve existir **Termos de Uso** e aviso do que fica salvo no navegador (tema e sessão) | CRIAR | P1 | não existem | páginas no ar e linkadas | pendente |
| PRIV-03 | O consentimento nos formulários deve ser registrado e versionado | APERFEIÇOAR | P0 | `aceite_lgpd` e `aceite_direitos` existem; sem versão do texto | coluna com a versão da política aceita | parcial |
| PRIV-04 | A pessoa deve poder **exportar** seus dados e excluir a conta | APERFEIÇOAR | P1 | exclusão existe (`excluir_minha_conta`); exportação não | botão "baixar meus dados" (JSON) em Meu perfil | exclusão feita; exportação pendente |
| PRIV-05 | Deve haver política e rotina de **retenção** (envios recusados, relatos anônimos, logs) | CRIAR | P2 | nada é apagado automaticamente | job agendado apaga após o prazo definido | pendente |
| PRIV-06 | Logs e métricas não devem conter dados pessoais | APERFEIÇOAR | P1 | logs do Apps Script já omitem conteúdo | revisão dos logs do site e do painel | parcial |
| PRIV-07 | Analytics, se houver, devem respeitar a privacidade (sem cookies, sem rastreio entre sites) | CRIAR | P1 | não há analytics | ferramenta aberta (ex.: Umami ou Plausible) sem banner de cookies | pendente |

## 3. Disponibilidade e resiliência

| ID | Requisito | Tipo | Pri. | Evidência | Critério de aceite | Estado |
|---|---|---|---|---|---|---|
| DISP-01 | O banco não pode pausar por inatividade | CRIAR | P0 | plano gratuito pausa após ~7 dias sem uso | rotina a cada 2 dias; banco nunca pausa | pendente |
| DISP-02 | **Backup** diário cifrado do banco, com **teste de restauração** mensal | CRIAR | P0 | plano gratuito sem backups | restauração em máquina limpa dentro do RTO | pendente |
| DISP-03 | Deve haver **monitoramento** com alerta de indisponibilidade | CRIAR | P0 | ninguém é avisado se o site cair | alerta por e-mail em até 10 minutos | pendente |
| DISP-04 | O front deve expor `/api/health` e a API `/health` | CRIAR | P1 | front sem endpoint; API tem `/health` | monitor consulta ambos | pendente |
| DISP-05 | Se o banco falhar, o conteúdo público deve continuar e as áreas logadas devem avisar de forma clara | APERFEIÇOAR | P1 | erros tratados em várias telas; sem teste | teste com banco desligado mantém vagas e trilhas | parcial |
| DISP-06 | Páginas de erro próprias (404, erro, erro global) com saída para o início | CRIAR | P1 | páginas padrão do Next | telas no padrão visual do site | pendente |
| DISP-07 | Plano de recuperação (runbook) com RPO e RTO | CRIAR | P1 | metas só em documento | passo a passo testado | pendente |
| DISP-08 | Deploy seguro: prévia por PR, rollback documentado, migrations aplicadas em ordem e registradas | APERFEIÇOAR | P1 | prévia por PR existe; migrations rodadas à mão no SQL Editor | `supabase db push` ou equivalente; histórico de migrations aplicadas | parcial |

## 4. Desempenho e escala

| ID | Requisito | Tipo | Pri. | Evidência | Critério de aceite | Estado |
|---|---|---|---|---|---|---|
| DESEMP-01 | Políticas RLS com `(select auth.uid())` e índices em `user_id` | APERFEIÇOAR | P0 | `auth.uid()` por linha; sem índice em `user_id` de artigos e palestrantes | 22 políticas reescritas; 3 índices criados | migration 009 validada, **falta aplicar** |
| DESEMP-02 | **Teste de carga** versionado (k6) antes da divulgação | CRIAR | P0 | inexistente | cenários do plano passam: p95 ≤ 300 ms, 5xx < 0,5% | pendente |
| DESEMP-03 | Reduzir as chamadas ao banco por carga de página logada (hoje ~5) para 1 | APERFEIÇOAR | P1 | sessão, perfil, vagas salvas, `is_admin` e inscrições em separado | uma função `minha_conta()` devolve tudo | pendente |
| DESEMP-04 | Medir e manter Web Vitals (LCP, INP, CLS) | CRIAR | P1 | sem medição | Lighthouse no CI com orçamento mínimo | pendente |
| DESEMP-05 | Listas do admin com paginação e totais calculados sem varrer tabelas grandes | APERFEIÇOAR | P2 | listas com limite fixo de 200; `admin_resumo` conta tudo a cada abertura | paginação; visão materializada quando passar de ~5 mil pessoas | pendente |

## 5. Qualidade e engenharia

| ID | Requisito | Tipo | Pri. | Evidência | Critério de aceite | Estado |
|---|---|---|---|---|---|---|
| QA-01 | Testes de ponta a ponta (Playwright) dos fluxos críticos | CRIAR | P1 | só testes unitários (57 no front, 22 no Apps Script, 119 em Python) | login, salvar vaga, progresso de trilha e envio de formulário no CI | pendente |
| QA-02 | Ambiente de **homologação** separado | CRIAR | P1 | testes de formulário gravam em produção | segundo projeto Supabase gratuito e preview apontando para ele | pendente |
| QA-03 | Acessibilidade verificada automaticamente (axe) | APERFEIÇOAR | P1 | contraste auditado à mão; sem checagem no CI | zero violações sérias nas telas principais | parcial |
| QA-04 | Monitoramento de erros no front | CRIAR | P2 | erros só no console | ferramenta aberta (ex.: GlitchTip) com alerta | pendente |

## 6. Produto, conteúdo e dados

| ID | Requisito | Tipo | Pri. | Evidência | Critério de aceite | Estado |
|---|---|---|---|---|---|---|
| PROD-01 | SEO: `robots.txt`, `sitemap.xml`, canonical, Open Graph e dados estruturados de vaga | CRIAR | P1 | `robots.txt` e `sitemap.xml` retornam 404 | páginas indexáveis; pré-visualização correta ao compartilhar | pendente |
| PROD-02 | Verificar os **termos de uso e o robots.txt da Gupy** antes de divulgar; plano B: exibir só título, empresa e link | CORRIGIR | P0 | pendência registrada no README; endereço usado é interno e já mudou uma vez | decisão registrada; plano B pronto | pendente |
| PROD-03 | Canal para empresas pedirem remoção ou correção de uma vaga | CRIAR | P1 | só o relato de erro de quem usa | e-mail ou formulário com prazo de resposta | pendente |
| PROD-04 | A coleta deve avisar quando vier vazia ou suspeita e manter o último conjunto de dados no ar | APERFEIÇOAR | P1 | trava `--minimo 200` existe; falha só gera e-mail do GitHub | alerta ativo; site nunca fica sem vagas | parcial |
| PROD-05 | Definir uma **licença** de código aberto e os documentos da comunidade (`LICENSE`, `CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`) | CRIAR | P0 | README: "licença ainda não definida" | arquivos na raiz; política de divulgação responsável de falhas | feito: MIT + `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md` e `CODE_OF_CONDUCT.md` (a licença pode ser trocada pela comunidade) |
| PROD-06 | Autoria e uso de imagens da equipe e dos eventos confirmados | CORRIGIR | P0 | autorização ainda não confirmada | autorização registrada | pendente |

## 7. Operação e governança

| ID | Requisito | Tipo | Pri. | Evidência | Critério de aceite | Estado |
|---|---|---|---|---|---|---|
| OPS-01 | **Domínio próprio** da DSE | CRIAR | P0 | endereço `.vercel.app` | site e e-mails no domínio da comunidade | pendente |
| OPS-02 | SMTP próprio com SPF, DKIM e DMARC para os e-mails de login | CRIAR | P0 | envio padrão do Supabase, com limite baixo | login por e-mail funciona com 100 pedidos na hora | pendente |
| OPS-03 | A infraestrutura deve estar em contas da **organização**, com 2 ou mais responsáveis e MFA | CORRIGIR | P0 | projetos em conta pessoal; uma pessoa por serviço | 2+ admins em GitHub, Vercel, Supabase, Google Cloud e Apps Script | parcial: repositório na organização `Dse-Academy` com 2 owners; falta Vercel/Supabase/Google/Apps Script em contas da organização, MFA e registro de acessos |
| OPS-04 | Aviso por e-mail e Agenda não podem depender da cota do Apps Script | APERFEIÇOAR | P2 | cota ≈ 100 e-mails por dia; um script em conta pessoal | fila no banco e worker próprio | pendente |
| OPS-05 | Monitorar as cotas gratuitas (usuários, tamanho do banco, banda) com alerta a 70% | CRIAR | P1 | sem acompanhamento | alerta ao atingir 70% de qualquer cota | pendente |
| OPS-06 | Runbooks e canal de incidente | CRIAR | P1 | não existem | documento curto por tipo de incidente | pendente |
| OPS-07 | Orçamento mínimo de contingência (plano pago do banco) definido como "plano B" | CRIAR | P2 | orçamento zero | decisão registrada e gatilho de uso (ex.: 70% da cota) | pendente |

---

## Visão por prioridade

**P0 (20), bloqueiam a divulgação aberta:**
SEG-01, SEG-03, SEG-04, SEG-05, SEG-09, SEG-10, SEG-11, PRIV-01, PRIV-03, DISP-01, DISP-02, DISP-03, DESEMP-01, DESEMP-02, PROD-02, PROD-05, PROD-06, OPS-01, OPS-02, OPS-03.

Destes, SEG-11 já está feito (só manter os testes) e SEG-03 e DESEMP-01 estão prontos na migration 009, faltando aplicar.

**Já prontos, falta só aplicar:** migration `009_robustez.sql` (SEG-03 parcial, DESEMP-01).

**Podem ser feitos sem decisão e sem custo:** SEG-01, SEG-09, SEG-08, DISP-01 a DISP-04, DISP-06, PRIV-01, PROD-01, PROD-05, DESEMP-02, SEG-07.

**Dependem de pessoas ou decisões externas:** OPS-01 a OPS-03 (domínio, SMTP e contas), PROD-02 e PROD-06 (termos da Gupy e autorização de imagens), PRIV-01 (revisão jurídica), SEG-04 (publicar o app do Google).

---

## Rastreabilidade com o plano de escala

| Fase de `escala-1000-usuarios.md` | Requisitos cobertos |
|---|---|
| Fase 1 (estabilizar) | SEG-01, SEG-03, SEG-05, SEG-09, SEG-10, DISP-01 a DISP-04, DESEMP-01, DESEMP-02, PRIV-01, OPS-02 |
| Fase 2 (infraestrutura própria) | DISP-07, DISP-08, OPS-04, QA-02, PRIV-05 |
| Fase 3 (alta disponibilidade) | DISP-05, OPS-07 |
| Produto e governança (transversal) | SEG-06, SEG-07, SEG-08, PRIV-02 a PRIV-07, QA-01, QA-03, QA-04, PROD-01 a PROD-06, OPS-01, OPS-03, OPS-05, OPS-06 |
