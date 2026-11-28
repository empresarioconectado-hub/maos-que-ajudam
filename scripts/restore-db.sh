#!/usr/bin/env bash
set -Eeuo pipefail

: "${DB_CNF_FILE:?Defina DB_CNF_FILE apontando para um arquivo de credenciais MySQL}"
arquivo="${1:-}"
if [[ -z "$arquivo" || ! -r "$arquivo" ]]; then
  echo "Uso: CONFIRM_RESTORE=YES DB_CNF_FILE=/caminho/.my.cnf $0 arquivo.sql.gz" >&2
  exit 2
fi
if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "Restauração substitui tabelas existentes. Defina CONFIRM_RESTORE=YES após validar o arquivo." >&2
  exit 3
fi
RESTORE_BIN="${RESTORE_BIN:-}"
if [[ -z "$RESTORE_BIN" ]]; then
  RESTORE_BIN="$(command -v mariadb || command -v mysql || true)"
fi
if [[ -z "$RESTORE_BIN" ]]; then echo "Instale mariadb ou mysql client." >&2; exit 1; fi
if ! gzip -t "$arquivo"; then
  echo "Arquivo gzip inválido ou corrompido." >&2
  exit 4
fi

gzip -dc "$arquivo" | "$RESTORE_BIN" --defaults-extra-file="$DB_CNF_FILE"
echo "Importação concluída. Execute as verificações funcionais antes de liberar o sistema."
