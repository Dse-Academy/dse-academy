# Rotação de segredos

Procedimento do requisito **SEG-05** (issue #32). Vale para todo segredo da DSE Academy: o que existe, onde fica, quem acessa, como trocar e quando.

> **Regra de ouro:** segredo nunca vai para conversa, e-mail, issue, PR, print ou commit. Cola-se direto no lugar de destino (painel do serviço, secret do GitHub, `.env` local).
> Se um segredo aparecer em qualquer um desses lugares, trate como vazado e troque (seção 4).

## 1. Inventário

| Segredo | Onde fica | Quem acessa | Para que serve | Periodicidade |
|---|---|---|---|---|
| `TOKEN` do webhook | Propriedade do script no Apps Script **e** na URL gravada na função `notificar_apps_script` do Supabase | quem administra o Apps Script e o Supabase | prova ao script que o aviso veio do Supabase | 6 meses, ou ao vazar |
| `GROQ_API_KEY` | `.env` local (ignorado pelo git) e Secret `GROQ_API_KEY` do GitHub Actions | quem gera as trilhas; GitHub Actions | organizar as trilhas com modelo aberto | 6 meses, ou ao vazar |
| Client Secret do Google OAuth | Supabase (Authentication, Providers, Google) | quem administra o Supabase e o Google Cloud | login com Google | 12 meses, ou ao vazar |
| `DEPLOY_KEY` (chave SSH de deploy) | Secret do GitHub Actions; a pública fica em *Settings > Deploy keys* do repositório | só o workflow | o job `dados-do-site-novo` grava na `main` protegida (SEG-09) | 12 meses, ou ao vazar |
| `BACKUP_PASSPHRASE` | Secret do GitHub Actions e cofre da equipe (SEG-10) | 2 pessoas da organização | abrir os backups cifrados | 12 meses, ou ao vazar |
| Chave **publishable** do Supabase | variáveis da Vercel e `.env.local` | pública por design | chamadas do site ao banco | só se o projeto trocar de chave |
| Sessão do GitHub CLI (`gh auth`) | máquina de quem desenvolve | cada pessoa | automação local | revogar se a máquina for perdida |

**O que não existe (e não deve existir):** chave `service_role`/*secret* do Supabase no site ou no repositório. A autorização é só pela RLS.

Registre abaixo a data de cada rotação (quem fez e quando):

| Segredo | Última rotação | Próxima |
|---|---|---|
| `TOKEN` do webhook | mantido por decisão em 17/10/2026 (ver seção 6) | até 17/04/2027 |
| `GROQ_API_KEY` | mantido por decisão em 17/10/2026 (ver seção 6) | até 17/04/2027 |
| Client Secret do Google | mantido por decisão em 17/10/2026 (ver seção 6) | até 17/10/2027 |
| `DEPLOY_KEY` | ainda não existe (SEG-09) | |
| `BACKUP_PASSPHRASE` | ainda não existe (SEG-10) | |

## 2. Como trocar cada um

### 2.1 `TOKEN` do webhook (Apps Script + Supabase)
O valor precisa ser **igual nos dois lados**. Se ficar diferente, o script responde `nao autorizado` e os avisos por e-mail e no Agenda param.

1. Gere o novo valor **sem exibi-lo** (PowerShell; copia direto para a área de transferência):
   ```powershell
   -join ((48..57)+(97..122) | Get-Random -Count 40 | % {[char]$_}) | Set-Clipboard
   ```
2. No Apps Script (conta que implantou o script): *Configurações do projeto > Propriedades do script > `TOKEN`*: cole o valor novo e salve.
3. No SQL Editor do Supabase, rode o bloco do [webhook_apps_script.sql](../supabase/manual/webhook_apps_script.sql) com a URL terminando em `?token=` seguido do valor novo (cole da área de transferência). **Não salve o arquivo com o valor preenchido.**
4. Teste: envie um artigo de teste logada e rode no SQL Editor:
   ```sql
   select status_code, left(content, 60) as resposta, created from net._http_response order by created desc limit 3;
   ```
   A resposta deve ser `ok`, não `nao autorizado`. Apague o artigo de teste depois.
5. Limpe a área de transferência e anote a data na tabela acima.

### 2.2 `GROQ_API_KEY`
1. Em console.groq.com/keys, crie uma chave nova.
2. Atualize o `.env` local e o Secret `GROQ_API_KEY` (*GitHub > Settings > Secrets and variables > Actions*).
3. **Revogue a chave antiga** no painel da Groq.
4. Teste sem mexer nos dados do site: `python -m trilhas.gerar --areas bi --saida "$TEMP/teste-groq"` (usa a chave nova e grava numa pasta temporária) ou dispare o workflow *Coleta e publicação*.

### 2.3 Client Secret do Google OAuth
1. Google Cloud Console > *APIs e serviços* > *Clientes* > o cliente da DSE > **Add secret** (o cliente aceita dois ao mesmo tempo).
2. Supabase > *Authentication > Sign In / Providers > Google*: cole o secret novo e salve.
3. Teste o login com Google em janela anônima.
4. Só depois, no Google Cloud, **desative** e então **exclua** o secret antigo.

### 2.4 `DEPLOY_KEY`
1. Gere um par novo (`ssh-keygen -t ed25519 -N "" -f chave`), sem exibir a privada.
2. Cadastre a **pública** em *Settings > Deploy keys* do repositório, com permissão de escrita, e **remova a antiga**.
3. Atualize o Secret `DEPLOY_KEY` com a **privada** e apague o arquivo local (`shred -u chave`).
4. Teste disparando o workflow *Coleta e publicação*: o job de dados deve conseguir gravar na `main`.

### 2.5 `BACKUP_PASSPHRASE` (quando o backup existir)
1. Gere uma passphrase nova e guarde no cofre da equipe.
2. Atualize o Secret do GitHub.
3. **Os backups antigos continuam exigindo a passphrase antiga**: guarde-a pelo tempo de retenção dos backups.

## 3. Rotina
- A cada 6 meses (ou 12, conforme a tabela), uma pessoa da organização troca os segredos vencidos e registra a data aqui.
- Quando alguém com acesso sair da equipe, troque tudo o que essa pessoa conhecia.
- O GitHub avisa por e-mail se um segredo conhecido for enviado ao repositório (secret scanning e push protection estão ativos).

## 4. Se um segredo vazou
Ordem importa: **conter, trocar, investigar**.

1. **Conter:** revogue/desative o segredo no serviço de origem (Groq, Google Cloud, Apps Script) **antes** de qualquer outra coisa.
2. **Trocar:** siga a seção 2 e gere um novo.
3. **Investigar:** veja se houve uso indevido: *Execuções* do Apps Script, uso da chave na Groq, auditoria do Google, `net._http_response` e as tabelas de envio no Supabase.
4. **Limpar:** se o segredo foi para um commit, o histórico do Git continua com ele mesmo depois de apagado do arquivo; a troca do segredo é obrigatória, reescrever histórico não basta.
5. **Registrar:** anote o que houve e a data na tabela da seção 1.

## 5. Verificação feita em outubro de 2026
Varredura de todo o histórico do repositório (97 commits) em busca de chaves da Groq, Client Secret do Google, chaves *secret* e JWT do Supabase, e do token do webhook: **nenhuma ocorrência**. O `.env` não é rastreado (só o `.env.example`). Os valores que apareceram em conversa foram só em conversa; mesmo assim a troca está planejada (SEG-05) por precaução.

## 6. Decisão registrada: manter o token do webhook, a chave da Groq e o Client Secret do Google
Em 17/10/2026 a liderança decidiu **manter** esses três segredos, sem trocá-los agora. Registro para não parecer esquecimento:

- **O que se sabe:** os valores apareceram em conversas de trabalho durante a construção do projeto. A varredura de todo o histórico do repositório (seção 5) não achou nenhum deles versionado.
- **Risco aceito:** quem tivesse acesso a essas conversas poderia usar os valores até que sejam trocados.
  - `TOKEN`: dispararia avisos falsos por e-mail e eventos no Agenda.
  - `GROQ_API_KEY`: consumiria a cota gratuita.
  - Client Secret do Google: só é útil junto com o Client ID e o fluxo do Supabase, e o redirecionamento é restrito ao endereço do projeto.
- **Condições para manter:** os valores continuam fora do repositório, de issues e de PRs; a rotina periódica da seção 3 segue valendo.
- **Gatilhos que obrigam a trocar na hora:** qualquer sinal de uso indevido (avisos estranhos, uso inesperado da cota, login estranho), saída de alguém que os conhecia, ou os valores aparecerem em algum lugar público. Nesses casos, siga a seção 4.
- **Reavaliar:** até **17/04/2027** (token e chave da Groq) e **17/10/2027** (Client Secret do Google).
