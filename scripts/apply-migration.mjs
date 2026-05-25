// Applique un fichier de migration SQL à la base Supabase.
// Usage : SUPABASE_DB_URL='postgres://...' node scripts/apply-migration.mjs supabase/migrations/0001_initial.sql
//
// L'application est atomique : tout est wrappé dans une transaction.
// En cas d'erreur, ROLLBACK et exit 1.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/apply-migration.mjs <path-to-sql>");
  process.exit(1);
}

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL env var");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");
const absPath = resolve(repoRoot, filePath);

console.log(`→ Reading ${absPath}`);
const sql = await readFile(absPath, "utf-8");

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  console.log("→ Connecting to database");
  await client.connect();

  console.log("→ Beginning transaction");
  await client.query("BEGIN");

  console.log("→ Executing migration SQL");
  await client.query(sql);

  console.log("→ Committing transaction");
  await client.query("COMMIT");

  console.log("✓ Migration applied successfully");
} catch (err) {
  console.error("✗ Migration failed:");
  console.error(err);
  try {
    await client.query("ROLLBACK");
    console.error("→ Transaction rolled back");
  } catch {
    /* connection may already be dead */
  }
  process.exit(1);
} finally {
  await client.end();
}
