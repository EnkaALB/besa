// Vérifie l'état du schéma Supabase : tables publiques, RLS, fonctions, enums.
// Usage : SUPABASE_DB_URL='postgres://...' node scripts/verify-schema.mjs

import pg from "pg";

const { Client } = pg;

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL env var");
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const tables = await client.query(`
    SELECT tablename, rowsecurity AS rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  console.log("\n=== Public tables ===");
  console.table(tables.rows);

  const policies = await client.query(`
    SELECT tablename, count(*)::int AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
    ORDER BY tablename
  `);
  console.log("\n=== RLS policy count per table ===");
  console.table(policies.rows);

  const funcs = await client.query(`
    SELECT proname AS function_name
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
    ORDER BY proname
  `);
  console.log("\n=== Custom functions ===");
  console.table(funcs.rows);

  const enums = await client.query(`
    SELECT t.typname AS enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typnamespace = 'public'::regnamespace
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  console.log("\n=== Custom enums ===");
  console.table(enums.rows);

  const triggers = await client.query(`
    SELECT event_object_schema || '.' || event_object_table AS table_name,
           trigger_name,
           event_manipulation AS event,
           action_timing AS timing
    FROM information_schema.triggers
    WHERE trigger_schema IN ('public', 'auth')
      AND trigger_name IN ('on_auth_user_created', 'users_updated_at')
    ORDER BY trigger_name
  `);
  console.log("\n=== Custom triggers ===");
  console.table(triggers.rows);
} finally {
  await client.end();
}
