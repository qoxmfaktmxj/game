#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -e .env.self-host ]]; then
  printf '%s\n' '.env.self-host already exists; keeping your secrets unchanged.'
  exit 0
fi
command -v openssl >/dev/null
umask 077
postgres_password=$(openssl rand -hex 32)
game_db_password=$(openssl rand -hex 32)
guest_signing_secret=$(openssl rand -hex 48)
{
  printf 'DOMAIN=game.minseok91.cloud\n'
  printf 'POSTGRES_PASSWORD=%s\n' "$postgres_password"
  printf 'GAME_DB_PASSWORD=%s\n' "$game_db_password"
  printf 'GUEST_SIGNING_SECRET=%s\n' "$guest_signing_secret"
} > .env.self-host
printf '%s\n' 'Created .env.self-host (mode 600). Keep this file private and back it up.'
