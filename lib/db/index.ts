/* ------------------------------------------------------------------ */
/*  CHECKION – Database client (PostgreSQL)                           */
/* ------------------------------------------------------------------ */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

function createDb() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required');
    const pool = new Pool({ connectionString, max: 10 });
    const db = drizzle(pool, { schema });
    return { db, pool };
}

const globalForDb = globalThis as unknown as { __checkionDb: ReturnType<typeof createDb> | undefined };

export function getDb() {
    if (!globalForDb.__checkionDb) globalForDb.__checkionDb = createDb();
    return globalForDb.__checkionDb.db;
}

export type Db = ReturnType<typeof createDb>['db'];

/** First argument to `db.transaction(async (tx) => …)` — not assignable to `Db` (no `$client`). */
export type DbTransaction = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Pool-backed DB or in-flight transaction (use for helpers called inside `transaction`). */
export type DbClient = Db | DbTransaction;
