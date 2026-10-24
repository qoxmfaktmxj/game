#!/usr/bin/env bash
set -euo pipefail
for migration in /migrations/*.sql; do
  psql --no-psqlrc --set ON_ERROR_STOP=1 --file "$migration"
done
psql --no-psqlrc --set ON_ERROR_STOP=1 --set "runtime_password=$GAME_DB_PASSWORD" --file /runtime-role.sql
