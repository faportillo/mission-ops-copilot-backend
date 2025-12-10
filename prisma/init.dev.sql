-- Dev-only initialization for local simplicity using the current Postgres user.
-- This script avoids creating extra roles and just sets up the `app` schema
-- owned by the connected user (e.g., POSTGRES_USER), with sensible privileges.

-- Create schema `app` owned by the current user (e.g., POSTGRES_USER)
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION CURRENT_USER;
ALTER SCHEMA app OWNER TO CURRENT_USER;

-- Ensure the current user can use the schema
GRANT USAGE ON SCHEMA app TO CURRENT_USER;

-- Default privileges for future objects created by the current user in schema `app`
ALTER DEFAULT PRIVILEGES FOR USER CURRENT_USER IN SCHEMA app
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES FOR USER CURRENT_USER IN SCHEMA app
GRANT USAGE, SELECT ON SEQUENCES TO CURRENT_USER;

-- If tables already exist (e.g., after a prior migration run), grant privileges now
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO CURRENT_USER;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO CURRENT_USER;
