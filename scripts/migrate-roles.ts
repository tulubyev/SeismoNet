// One-shot: `npm run migrate:roles` (through the SSH tunnel, BEFORE deploying the roles code).
// 1. applies migrations/0006_roles.sql unless user_role already has 'superadmin'
// 2. re-hashes every plaintext password (rows without the `hash.salt` format)
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { hashPassword, isHashed } from "../server/lib/password";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (run with node --env-file=.env)");
const pool = new pg.Pool({ connectionString: url, ssl: false });

async function main() {
  const { rows: enumRows } = await pool.query<{ enumlabel: string }>(
    `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'user_role'`,
  );
  const labels = enumRows.map(r => r.enumlabel);
  if (labels.includes("superadmin")) {
    console.log(`enum user_role already migrated (${labels.join(", ")}) — skipping SQL`);
  } else {
    const sql = fs.readFileSync(path.resolve(import.meta.dirname, "../migrations/0006_roles.sql"), "utf8");
    await pool.query(sql);
    console.log("applied migrations/0006_roles.sql");
  }

  const { rows: users } = await pool.query<{ id: number; username: string; password: string }>(
    `SELECT id, username, password FROM users`,
  );
  let rehashed = 0;
  for (const u of users) {
    if (isHashed(u.password)) continue;
    await pool.query(`UPDATE users SET password = $1, updated_at = now() WHERE id = $2`, [await hashPassword(u.password), u.id]);
    console.log(`re-hashed password for ${u.username} (id=${u.id})`);
    rehashed++;
  }
  console.log(`done: ${users.length} users, ${rehashed} passwords re-hashed`);

  const { rows: byRole } = await pool.query<{ role: string; n: string }>(`SELECT role, count(*) AS n FROM users GROUP BY role ORDER BY role`);
  console.table(byRole);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => pool.end());
