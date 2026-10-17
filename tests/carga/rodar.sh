#!/usr/bin/env bash
# Roda os cenários de teste de carga num ambiente 100% local e descartável. NUNCA contra a produção.
#
# Uso:   ./rodar.sh [cenario]       (padrão: todos)
#        cenários: publico | logada | pico | abuso | estresse | banco-fora | todos
# Opções por variável de ambiente:
#        SEED_USUARIOS=5000   quantas pessoas simular no banco (padrão 1000)
#        MANTER=1             não derruba o ambiente no fim (para investigar)
#
# Requisitos: Docker ligado, Node.js e as dependências do site instaladas (npm ci em apps/web).
# Cada cenário começa com o banco recriado do zero, para um não interferir no outro.
set -uo pipefail
cd "$(dirname "$0")"
RAIZ="$(cd ../.. && pwd)"
AQUI="$(pwd)"
PORTA_SITE=3199
TODOS="publico logada pico abuso estresse banco-fora"
ALVO="${1:-todos}"
[ "$ALVO" = "todos" ] && ALVO="$TODOS"

for c in $ALVO; do
  [ -f "k6/$c.js" ] || { echo "Cenário desconhecido: $c (opções: $TODOS)"; exit 2; }
done
docker info >/dev/null 2>&1 || { echo "O Docker não está ligado. Abra o Docker Desktop e tente de novo."; exit 1; }

parar_site() {
  if command -v powershell >/dev/null 2>&1; then
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort $PORTA_SITE -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
  elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORTA_SITE}/tcp" >/dev/null 2>&1
  fi
}

limpar() {
  parar_site
  [ "${MANTER:-0}" = "1" ] || docker compose down -v >/dev/null 2>&1
}
trap limpar EXIT

subir_banco() {
  docker compose down -v >/dev/null 2>&1
  SEED_USUARIOS="${SEED_USUARIOS:-1000}" docker compose up -d --wait db postgrest gateway || return 1
  # O PostgREST demora um instante para ler o esquema depois de subir.
  for _ in $(seq 1 60); do
    curl -sf -o /dev/null "http://localhost:3300/rest/v1/" && return 0
    sleep 1
  done
  echo "O banco de teste não ficou pronto."; return 1
}

# 1) O site compilado (como na produção), apontando para o banco de teste só para o /api/health?db=1.
echo ">> compilando o site (modo produção)"
# A "chave pública" do banco de teste é um JWT de verdade (papel anon), assinado com o segredo de teste, como no Supabase.
CHAVE_ANON="$(JWT_SECRET="${JWT_SECRET:-segredo-de-teste-com-mais-de-32-caracteres-ok}" node -e '
const c=require("crypto"),b=(o)=>Buffer.from(JSON.stringify(o)).toString("base64url");
const t=b({alg:"HS256",typ:"JWT"})+"."+b({role:"anon",iss:"teste"});
console.log(t+"."+c.createHmac("sha256",process.env.JWT_SECRET).update(t).digest("base64url"));')"
( cd "$RAIZ/apps/web" && NEXT_PUBLIC_SUPABASE_URL="http://localhost:3300" NEXT_PUBLIC_SUPABASE_ANON_KEY="$CHAVE_ANON" npx next build >/dev/null ) || { echo "Falha ao compilar o site."; exit 1; }
parar_site
cd "$RAIZ/apps/web"
nohup npx next start -p "$PORTA_SITE" >"$AQUI/resultados/site.log" 2>&1 &
cd "$AQUI"
for _ in $(seq 1 60); do curl -sf -o /dev/null "http://127.0.0.1:$PORTA_SITE/" && break; sleep 1; done
curl -sf -o /dev/null "http://127.0.0.1:$PORTA_SITE/" || { echo "O site não subiu na porta $PORTA_SITE."; exit 1; }

# 2) Os cenários, um a um.
FALHARAM=""
for c in $ALVO; do
  echo; echo "================ cenário: $c ================"
  subir_banco || { FALHARAM="$FALHARAM $c"; continue; }

  if [ "$c" = "banco-fora" ]; then
    # Derruba o banco aos 40 s e o religa aos 140 s, enquanto o k6 navega.
    ( sleep 40; echo ">> DESLIGANDO o banco"; docker compose stop db >/dev/null 2>&1; sleep 100; echo ">> RELIGANDO o banco"; docker compose start db >/dev/null 2>&1 ) &
  fi

  # MSYS_NO_PATHCONV: o Git Bash no Windows reescreveria /scripts/... como caminho do Windows.
  MSYS_NO_PATHCONV=1 SEED_USUARIOS="${SEED_USUARIOS:-1000}" docker compose --profile k6 run --rm k6 run --summary-export="/resultados/$c.json" "/scripts/$c.js"
  codigo=$?
  wait
  [ "$codigo" -eq 0 ] && echo ">> $c: PASSOU" || { echo ">> $c: FALHOU (código $codigo; 99 = algum limite não foi cumprido)"; FALHARAM="$FALHARAM $c"; }
done

echo
if [ -z "$FALHARAM" ]; then echo "Todos os cenários passaram."; else echo "Cenários que não passaram:$FALHARAM"; exit 1; fi
