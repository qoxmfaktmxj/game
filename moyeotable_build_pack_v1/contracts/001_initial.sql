-- DRAFT: Supabase PostgreSQL environment only; NOT executed by this package.
-- Review in a test project before applying. Never expose game_private in Data API.
BEGIN;
CREATE SCHEMA IF NOT EXISTS game_private;
REVOKE ALL ON SCHEMA game_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 2 AND 20),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Migration is intended to run once. Existing policy names must be reconciled first.
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (user_id, nickname), UPDATE (nickname) ON public.profiles TO authenticated;

CREATE TABLE game_private.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 40),
  game_key text NOT NULL DEFAULT 'star-trails',
  capacity smallint NOT NULL DEFAULT 2 CHECK (capacity BETWEEN 2 AND 8),
  status text NOT NULL DEFAULT 'LOBBY' CHECK (status IN ('LOBBY','PLAYING','CLOSED')),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE game_private.table_members (
  table_id uuid NOT NULL REFERENCES game_private.tables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  seat_index smallint NOT NULL CHECK (seat_index BETWEEN 0 AND 7),
  ready boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (table_id,user_id), UNIQUE(table_id,seat_index)
);
CREATE TABLE game_private.table_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES game_private.tables(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (char_length(token_hash)=64),
  expires_at timestamptz NOT NULL,
  remaining_uses smallint NOT NULL CHECK (remaining_uses BETWEEN 0 AND 8),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE game_private.game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES game_private.tables(id),
  game_key text NOT NULL,
  rules_version text NOT NULL,
  content_version text NOT NULL,
  schema_version integer NOT NULL CHECK (schema_version>0),
  version bigint NOT NULL DEFAULT 0 CHECK (version>=0),
  owner_epoch bigint NOT NULL DEFAULT 1 CHECK (owner_epoch>0),
  status text NOT NULL CHECK (status IN ('RUNNING','PAUSED','FINISHED','ABORTED')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE UNIQUE INDEX one_active_session_per_table ON game_private.game_sessions(table_id) WHERE status IN ('RUNNING','PAUSED');
CREATE TABLE game_private.game_players (
  session_id uuid NOT NULL REFERENCES game_private.game_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  seat_index smallint NOT NULL CHECK (seat_index BETWEEN 0 AND 7),
  PRIMARY KEY(session_id,user_id), UNIQUE(session_id,seat_index)
);
CREATE TABLE game_private.game_snapshots (
  session_id uuid PRIMARY KEY REFERENCES game_private.game_sessions(id) ON DELETE CASCADE,
  version bigint NOT NULL CHECK (version>=0),
  state_json jsonb NOT NULL,
  written_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE game_private.game_commands (
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  command_id uuid NOT NULL,
  payload_hash text NOT NULL CHECK (char_length(payload_hash)=64),
  accepted_version bigint NOT NULL CHECK (accepted_version>0),
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id,user_id,command_id),
  UNIQUE(session_id,accepted_version),
  FOREIGN KEY(session_id,user_id) REFERENCES game_private.game_players(session_id,user_id)
);
CREATE TABLE game_private.game_results (
  session_id uuid PRIMARY KEY REFERENCES game_private.game_sessions(id) ON DELETE CASCADE,
  finish_reason text NOT NULL CHECK (finish_reason IN ('DECK_EXHAUSTED','RESIGN','DISCONNECT_FORFEIT','ABORT','SERVER_FAILURE')),
  summary_json jsonb NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_table_history ON game_private.game_sessions(table_id,started_at DESC);
CREATE INDEX members_user ON game_private.table_members(user_id);
CREATE INDEX invites_expiry ON game_private.table_invites(expires_at);

-- Defence in depth: no policies for ordinary users on private tables.
ALTER TABLE game_private.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.table_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.table_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.game_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.game_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_private.game_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA game_private FROM PUBLIC, anon, authenticated;
-- Use a server-only dedicated DB role/connection with reviewed privileges.
-- Do NOT grant game_private to browser JWT roles. Do NOT ship service_role keys.
COMMIT;

-- Atomic command transaction pattern (illustrative, implement with parameters):
-- BEGIN;
-- lookup existing (session_id,user_id,command_id), compare payload hash first;
-- UPDATE game_sessions SET version=:newVersion
--   WHERE id=:id AND version=:expected AND owner_epoch=:epoch;
-- require exactly 1 updated row; otherwise rollback / VERSION_CONFLICT;
-- INSERT game_commands(...); UPSERT game_snapshots(...);
-- if finished: insert game_results and update session/table status;
-- COMMIT;
-- Only then replace in-memory state and send ACK / per-player view.
-- Validate table membership, frozen session players, seat < table capacity in service.
