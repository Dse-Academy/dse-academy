#!/bin/sh
# Roda as migrations do projeto em ordem e depois cria os dados de teste. Executado pelo Postgres na primeira subida.
set -eu

for arquivo in $(ls /migrations/*.sql | sort); do
  echo ">> migration $(basename "$arquivo")"
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f "$arquivo"
done

echo ">> dados de teste: ${SEED_USUARIOS:-1000} pessoas"
psql -v ON_ERROR_STOP=1 -v usuarios="${SEED_USUARIOS:-1000}" -U postgres -d postgres -f /seed/90_seed.sql
