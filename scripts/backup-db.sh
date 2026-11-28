#!/usr/bin/env bash
set -Eeuo pipefail

: "${DB_NAME:?Defina DB_NAME}"
if ! [[ "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then echo "DB_NAME inválido." >&2; exit 1; fi
: "${DB_CNF_FILE:?Defina DB_CNF_FILE apontando para um arquivo de credenciais MySQL}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

if [[ ! -r "$DB_CNF_FILE" ]]; then
  echo "Arquivo de credenciais não encontrado ou sem permissão de leitura." >&2
  exit 1
fi
if ! [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_RETENTION_DAYS deve ser um inteiro não negativo." >&2
  exit 1
fi

DUMP_BIN="${DUMP_BIN:-}"
if [[ -z "$DUMP_BIN" ]]; then
  DUMP_BIN="$(command -v mariadb-dump || command -v mysqldump || true)"
fi
if [[ -z "$DUMP_BIN" ]]; then echo "Instale mariadb-dump ou mysqldump." >&2; exit 1; fi

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
arquivo="$BACKUP_DIR/$DB_NAME-$stamp.sql.gz"
temporario="$arquivo.tmp"
trap 'rm -f "$temporario"' EXIT

"$DUMP_BIN" --defaults-extra-file="$DB_CNF_FILE" \
  --single-transaction --routines --triggers --events --hex-blob \
  --add-drop-table --databases "$DB_NAME" | gzip -c > "$temporario"

gzip -t "$temporario"
mv "$temporario" "$arquivo"
chmod 600 "$arquivo"
find "$BACKUP_DIR" -maxdepth 1 -type f -name "$DB_NAME-*.sql.gz" \
  -mtime "+$BACKUP_RETENTION_DAYS" -delete

echo "Backup validado: $arquivo"
