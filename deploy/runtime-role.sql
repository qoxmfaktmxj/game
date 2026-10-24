BEGIN;
SELECT 'CREATE ROLE ringuringu LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ringuringu') \gexec
SELECT format('ALTER ROLE ringuringu LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L', :'runtime_password') \gexec
GRANT CONNECT ON DATABASE ringuringu TO ringuringu;
GRANT USAGE ON SCHEMA game_private TO ringuringu;
GRANT SELECT, INSERT, UPDATE ON game_private.table_aggregates TO ringuringu;
DROP POLICY IF EXISTS game_runtime ON game_private.table_aggregates;
CREATE POLICY game_runtime ON game_private.table_aggregates TO ringuringu USING (true) WITH CHECK (true);
COMMIT;
