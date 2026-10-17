# Política de segurança

Obrigada por ajudar a manter a DSE Academy segura. Este projeto é mantido por voluntárias e voluntários da comunidade,
então as metas abaixo são de **melhor esforço**, mas levamos todo relato a sério.

## Como relatar uma vulnerabilidade

**Não abra uma issue pública** para falhas de segurança: ela ficaria visível para qualquer pessoa antes de corrigirmos.

Use um destes canais privados:

1. **GitHub:** aba *Security* do repositório > *Report a vulnerability* (relato privado de vulnerabilidade), se estiver disponível.
2. **E-mail:** academydserec@gmail.com, com o assunto `[SEGURANÇA] resumo do problema`.

Se puder, inclua:

- o que você encontrou e onde (endereço da página, rota ou arquivo);
- como reproduzir, passo a passo;
- o impacto que você imagina (que dado ou ação ficaria exposto);
- evidências (prints, trechos de resposta). **Não envie dados pessoais de terceiros nem segredos reais.**

## O que esperar de nós

| Etapa | Meta |
|---|---|
| Confirmar que recebemos | até 7 dias |
| Avaliar e responder com o plano | até 30 dias |
| Corrigir | conforme a gravidade; as críticas primeiro |

Mantemos você informada(o) e, se quiser, citamos o seu nome na correção. Não temos programa de recompensa em dinheiro.

## O que está no escopo

- O site (`apps/web`) e a API (`apps/api`) deste repositório.
- As regras de acesso do banco (`supabase/migrations`): por exemplo, ler ou alterar dados de outra pessoa.
- Os workflows de automação (`.github/workflows`).

## Fora do escopo

- Falhas em serviços de terceiros que usamos (Supabase, Vercel, GitHub, Google); relate diretamente a eles.
- Ataques de negação de serviço, testes de carga sem combinar e engenharia social contra pessoas da comunidade.
- Relatos automáticos de scanners sem uma demonstração de impacto real.

## Regras para pesquisar com segurança

- Teste só com contas suas. Não acesse, altere ou apague dados de outras pessoas.
- Pare assim que confirmar a falha; não aprofunde nem exfiltre dados.
- Dê-nos um prazo razoável para corrigir antes de divulgar publicamente.

Quem seguir estas regras, de boa-fé, não será alvo de ação por parte da DSE Academy.

## Versões

Só a versão em produção (branch `main`) recebe correções de segurança.

## Segredos vazados

Se você achar um segredo (chave, token, senha) neste repositório ou em um endereço público do projeto, relate pelos canais acima. Nós o trocamos imediatamente.
