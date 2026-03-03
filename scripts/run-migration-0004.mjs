#!/usr/bin/env node
/**
 * One-time migration: drop user_id FK constraints so PLEXON user IDs can be
 * stored without a row in CHECKION's users table. Safe to run repeatedly (IF EXISTS).
 * Run from /app: node scripts/run-migration-0004.mjs
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, '../lib/db/migrations/0004_drop_user_id_fk_for_plexon.sql');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log('[CHECKION] DATABASE_URL not set, skipping migration 0004.');
  process.exit(0);
}

const sql = fs.readFileSync(migrationPath, 'utf8');
const statements = sql
  .split(/--> statement-breakpoint\n?/)
  .map((s) => s.replace(/^--[^\n]*\n?/gm, '').trim())
  .filter((s) => /^ALTER TABLE/i.test(s));

if (statements.length === 0) {
  console.log('[CHECKION] No ALTER statements in migration 0004.');
  process.exit(0);
}

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  for (const statement of statements) {
    await client.query(statement);
  }
  console.log('[CHECKION] Migration 0004 (drop user_id FKs) applied.');
} catch (err) {
  console.warn('[CHECKION] Migration 0004 failed (non-fatal):', err?.message || err);
} finally {
  await client.end();
}
