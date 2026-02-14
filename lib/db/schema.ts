/* ------------------------------------------------------------------ */
/*  CHECKION – Database schema (Drizzle + PostgreSQL)                 */
/* ------------------------------------------------------------------ */

import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name'),
    company: text('company'),
    avatarUrl: text('avatar_url'),
    locale: text('locale'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const scans = pgTable('scans', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    device: text('device').notNull(),
    groupId: text('group_id'),
    timestamp: text('timestamp').notNull(),
    result: jsonb('result').notNull(), // ScanResult
});

export const domainScans = pgTable('domain_scans', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
    status: text('status').notNull(),
    timestamp: text('timestamp').notNull(),
    payload: jsonb('payload').notNull(), // DomainScanResult
});
