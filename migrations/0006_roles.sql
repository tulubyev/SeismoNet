-- Six roles per docs/roles-specification.md + staff ↔ object binding.
-- Applied by scripts/migrate-roles.ts (which carries its own idempotency guard).
-- This file is ALSO self-guarding: re-running it on an already-migrated database
-- is a no-op, so a stray `psql -f` can't remap live superadmins to data_analyst.
-- Plain DDL statements are legal inside a DO/PLpgSQL block (no EXECUTE needed);
-- only utility commands that PL/pgSQL cannot plan would require dynamic SQL.
BEGIN;

CREATE TABLE IF NOT EXISTS user_objects (
  user_id   integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_id integer NOT NULL REFERENCES infrastructure_objects(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, object_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'superadmin'
  ) THEN
    ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN role TYPE text USING role::text;
    DROP TYPE IF EXISTS user_role;
    CREATE TYPE user_role AS ENUM ('superadmin', 'designer', 'seismologist', 'data_analyst', 'device_manager', 'staff');

    -- Only the legacy three-role vocabulary is remapped; anything else is left alone.
    UPDATE users
       SET role = CASE role WHEN 'administrator' THEN 'superadmin' ELSE 'data_analyst' END
     WHERE role IN ('administrator', 'user', 'viewer');

    ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff';
  END IF;
END $$;

COMMIT;
