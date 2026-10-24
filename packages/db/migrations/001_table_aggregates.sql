-- Apply in a staging PostgreSQL database first. This migration has not been
-- executed against a hosted database. Use a dedicated game-server DB role.
-- This aggregate replaces (does not supplement) the pack's illustrative SQL.
BEGIN;
CREATE SCHEMA IF NOT EXISTS game_private;
REVOKE ALL ON SCHEMA game_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS game_private.table_aggregates (
  id uuid PRIMARY KEY,
  revision bigint NOT NULL CHECK (revision >= 0),
  owner_epoch bigint NOT NULL CHECK (owner_epoch > 0),
  document jsonb NOT NULL CHECK (document->>'schemaVersion' = '1'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((document->'table'->>'id')::uuid = id),
  CHECK ((document->'table'->>'revision')::bigint = revision),
  CHECK ((document->>'ownerEpoch')::bigint = owner_epoch)
);
CREATE INDEX IF NOT EXISTS table_aggregate_members ON game_private.table_aggregates USING gin ((document->'table'->'members'));
ALTER TABLE game_private.table_aggregates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON game_private.table_aggregates FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA game_private FROM anon;
    REVOKE ALL ON game_private.table_aggregates FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA game_private FROM authenticated;
    REVOKE ALL ON game_private.table_aggregates FROM authenticated;
  END IF;
END $$;
-- Migration owner can access the table. For a separate runtime role, explicitly
-- grant USAGE/SELECT/INSERT/UPDATE and a role-scoped RLS policy after creating it.
-- Never expose game_private through Supabase Data API or client credentials.
COMMIT;
