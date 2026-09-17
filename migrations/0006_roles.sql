-- Six roles per docs/roles-specification.md + staff ↔ object binding.
-- Applied once by scripts/migrate-roles.ts (idempotent guard lives there).
BEGIN;

CREATE TABLE IF NOT EXISTS user_objects (
  user_id   integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object_id integer NOT NULL REFERENCES infrastructure_objects(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, object_id)
);

ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users ALTER COLUMN role TYPE text USING role::text;
DROP TYPE IF EXISTS user_role;
CREATE TYPE user_role AS ENUM ('superadmin', 'designer', 'seismologist', 'data_analyst', 'device_manager', 'staff');

UPDATE users SET role = CASE role WHEN 'administrator' THEN 'superadmin' ELSE 'data_analyst' END;

ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff';

COMMIT;
