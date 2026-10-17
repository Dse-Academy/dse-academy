# Como contribuir com a DSE Academy

Que bom ter você por aqui! Este é um projeto aberto, feito pela comunidade de dados para a comunidade de dados. Qualquer pessoa pode
ajudar: com código, conteúdo das trilhas, correção de vagas classificadas errado, documentação, testes ou ideias.

Antes de começar, leia o [Código de conduta](CODE_OF_CONDUCT.md). Para falhas de segurança, **não abra issue**: veja [SECURITY.md](SECURITY.md).

## Onde está o quê

| Pasta | O que é |
|---|---|
| `apps/web/` | o site (Next.js, TypeScript, Tailwind) |
| `apps/api/` | API (FastAPI), ainda não usada pelo site |
| `supabase/migrations/` | banco de dados: tabelas, regras de acesso (RLS) e funções |
| `ingestion/`, `enrichment/`, `trilhas/`, `app/` | coleta de vagas, taxonomia, geração das trilhas e dos dados do site |
| `integrations/apps-script/` | aviso por e-mail e Agenda dos formulários |
| `docs/` | requisitos, plano de escala, rotação de segredos |

O README da raiz explica como a coleta e o site funcionam; o de `apps/web` explica o front.

## Por onde começar

- O roteiro de produtização está na issue [#80](https://github.com/Dse-Academy/dse-academy/issues/80), com a ordem de execução.
- Procure issues com o rótulo `good first issue` ou `help wanted`.
- Tem uma ideia ou achou um erro numa vaga? Abra uma issue descrevendo o que viu e o que esperava.
- Para mudanças grandes, **abra uma issue antes** de escrever código, para combinarmos o rumo.

## Como rodar localmente

```bash
git clone git@github.com:Dse-Academy/dse-academy.git
cd dse-academy

# Python (coleta, trilhas, testes)
python -m venv .venv && source .venv/bin/activate    # no Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m pytest -q

# Site
cd apps/web
npm ci
cp .env.example .env.local   # preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:3000
```

Sem Supabase, dá para testar as telas que exigem login com a conta de teste do desenvolvimento
(`NEXT_PUBLIC_CONTA_FAKE=1`, veja `apps/web/README.md`). **Nunca** publique com essa variável.

## Fluxo de uma contribuição

1. **Branch** a partir da `main`, com prefixo do tipo: `feat/...`, `fix/...`, `docs/...`, `ci/...`, `chore/...`.
2. Faça a mudança, **com testes** quando houver lógica nova.
3. Rode os checks abaixo.
4. Abra um **Pull Request** para a `main`, explicando o que mudou e por quê.
5. Os checks `api`, `web` e `apps-script` precisam passar. A `main` é protegida: não aceita push direto, force-push nem exclusão.
6. Depois da revisão, o PR entra com *merge commit*.

### Checks antes de abrir o PR

```bash
# site (em apps/web)
npm run typecheck && npm run lint && npm test && npm run build

# Python (na raiz)
python -m pytest -q

# aviso por e-mail e Agenda (na raiz)
node --test integrations/apps-script/notificar-submissoes.test.mjs
```

Se mexeu em `supabase/migrations`, valide também no Postgres embutido (instruções no topo de `tests/banco/validar-migrations.mjs`).

## Padrão de commits

[Conventional Commits](https://www.conventionalcommits.org/), em português, com escopo:

```
feat(web): quadro "Sua atividade" no perfil
fix(ingestion): novo endpoint de busca de vagas da Gupy
docs: procedimento de rotação de segredos
ci: roda em todo pull request
```

## Regras que valem para todo PR

- **Nada de segredos** no código, em issues, em PRs, em prints ou em logs: chaves, tokens, senhas, o arquivo `.env`. A chave *publishable* do Supabase é pública por design; a *secret*/*service_role* nunca vai para o site nem para o repositório.
- **Dados pessoais:** não inclua e-mails, telefones ou fotos de pessoas sem autorização. Nos testes, use dados fictícios.
- **Banco de dados:** mudanças só por **migration nova e numerada** (`supabase/migrations/NNN_nome.sql`), idempotente (pode rodar de novo sem erro). Nunca edite uma migration que já foi aplicada. Toda tabela nova precisa de RLS e de testes de acesso.
- **Acessibilidade:** o site já tem alvo de toque mínimo de 44 px e contraste de pelo menos 4,5:1 nos dois temas. Use os estilos de `apps/web/src/lib/botoes.ts` em vez de repetir classes.
- **Conteúdo das trilhas:** edite os arquivos `trilhas/*.yaml` (recursos, níveis e projetos). Só links gratuitos e abertos; há testes que validam ids, níveis e `https`.
- **Texto da interface** em português do Brasil.

## Licença

Ao contribuir, você concorda que a sua contribuição seja licenciada sob a [Licença MIT](LICENSE), a mesma do projeto.
As fotos e os logos da equipe e dos eventos **não** estão cobertos por essa licença (veja o README).

## Dúvidas

Abra uma issue com a pergunta ou procure a comunidade pelos canais divulgados no site (aba *Fale conosco*). Toda pergunta é bem-vinda.
