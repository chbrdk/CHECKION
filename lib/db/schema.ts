/* ------------------------------------------------------------------ */
/*  CHECKION – Database schema (Drizzle + PostgreSQL)                 */
/* ------------------------------------------------------------------ */

import { pgTable, text, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

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

/** API tokens for programmatic access (e.g. MCP server). Bearer token → user. */
export const apiTokens = pgTable('api_tokens', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth; no FK so PLEXON users don't need a row in CHECKION users
    tokenHash: text('token_hash').notNull(),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** User projects: group domain/scans/journeys/geo-runs for a customer or domain. Competitors = single source of truth for rank tracking and GEO. */
export const projects = pgTable('projects', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth
    name: text('name').notNull(),
    domain: text('domain'),
    competitors: jsonb('competitors').notNull().default([]), // string[] – competitor domains
    geoQueries: jsonb('geo_queries').notNull().default([]), // string[] – GEO/E-E-A-T queries for this project
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const scans = pgTable('scans', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    device: text('device').notNull(),
    groupId: text('group_id'),
    timestamp: text('timestamp').notNull(),
    result: jsonb('result').notNull(), // ScanResult
    llmSummary: jsonb('llm_summary'), // UxCxSummary | null
});

export const domainScans = pgTable('domain_scans', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    domain: text('domain').notNull(),
    status: text('status').notNull(),
    timestamp: text('timestamp').notNull(),
    payload: jsonb('payload').notNull(), // DomainScanResult
});

/** Share links: public landing page for a scan (single, domain, journey, or geo_eeat). Token in URL, optional password. */
export const shareLinks = pgTable('share_links', {
    token: text('token').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth
    resourceType: text('resource_type').notNull(), // 'single' | 'domain' | 'journey' | 'geo_eeat'
    resourceId: text('resource_id').notNull(),
    passwordHash: text('password_hash'), // optional; if set, viewer must submit password to access
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
});

/** Saved user journeys (goal + result) for history and restore. */
export const savedJourneys = pgTable('saved_journeys', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth
    domainScanId: text('domain_scan_id').notNull().references(() => domainScans.id, { onDelete: 'cascade' }),
    name: text('name'),
    goal: text('goal').notNull(),
    result: jsonb('result').notNull(), // JourneyResult
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** UX Journey Agent runs (browser-use): history of started/completed journeys. */
export const journeyRuns = pgTable('journey_runs', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    task: text('task').notNull(),
    status: text('status').notNull(), // 'running' | 'complete' | 'error'
    result: jsonb('result'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** GEO / E-E-A-T intensive analysis runs (on-page + optional competitive benchmark). */
export const geoEeatRuns = pgTable('geo_eeat_runs', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    domainScanId: text('domain_scan_id').references(() => domainScans.id, { onDelete: 'set null' }),
    status: text('status').notNull(), // 'queued' | 'running' | 'complete' | 'error'
    payload: jsonb('payload'), // GeoEeatIntensiveResult when complete
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** One competitive benchmark run (questions analysis) per geo_eeat run. */
export const geoEeatCompetitiveRuns = pgTable('geo_eeat_competitive_runs', {
    id: text('id').primaryKey(),
    geoEeatRunId: text('geo_eeat_run_id').notNull().references(() => geoEeatRuns.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    status: text('status').notNull(), // 'running' | 'complete' | 'error'
    competitiveByModel: jsonb('competitive_by_model'), // Record<string, CompetitiveBenchmarkResult>
    queries: jsonb('queries').notNull(), // string[]
    competitors: jsonb('competitors').notNull(), // string[]
    error: text('error'),
});

/** Rank tracking: keywords per project for SERP position monitoring. Country + language (gl/hl) always set for main markets. */
export const rankTrackingKeywords = pgTable('rank_tracking_keywords', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    domain: text('domain').notNull(),
    keyword: text('keyword').notNull(),
    country: text('country').notNull(), // gl, e.g. de, us
    language: text('language').notNull(), // hl, e.g. de, en
    device: text('device'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Rank tracking: position history per keyword (1–100 or null if not in top 100). competitor_positions = domain -> position for project competitors (same SERP). */
export const rankTrackingPositions = pgTable('rank_tracking_positions', {
    id: text('id').primaryKey(),
    keywordId: text('keyword_id').notNull().references(() => rankTrackingKeywords.id, { onDelete: 'cascade' }),
    position: integer('position'), // 1–100 or null
    competitorPositions: jsonb('competitor_positions'), // Record<string, number | null> – domain -> position
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
});
