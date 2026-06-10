/* ------------------------------------------------------------------ */
/*  CHECKION – Database schema (Drizzle + PostgreSQL)                 */
/* ------------------------------------------------------------------ */

import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, jsonb, integer, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const PROJECT_MEMBER_ROLE = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
} as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLE)[keyof typeof PROJECT_MEMBER_ROLE];

export const PROJECT_MEMBER_STATUS = {
    ACTIVE: 'active',
    INVITED: 'invited',
} as const;
export type ProjectMemberStatus = (typeof PROJECT_MEMBER_STATUS)[keyof typeof PROJECT_MEMBER_STATUS];

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

/** Auditable marketing opt-in (e.g. AMC / demo registration). Migration 0022. */
export const userMarketingConsents = pgTable(
    'user_marketing_consents',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(),
        email: text('email').notNull(),
        name: text('name'),
        company: text('company'),
        marketingOptInAt: timestamp('marketing_opt_in_at', { withTimezone: true }).notNull().defaultNow(),
        source: text('source').notNull().default('amc'),
    },
    (t) => ({
        emailIdx: index('user_marketing_consents_email_idx').on(t.email),
        userIdIdx: index('user_marketing_consents_user_id_idx').on(t.userId),
    })
);

/** API tokens for programmatic access (e.g. MCP server). Bearer token → user. */
export const apiTokens = pgTable('api_tokens', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth; no FK so PLEXON users don't need a row in CHECKION users
    tokenHash: text('token_hash').notNull(),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** User projects: group domain/scans/journeys/geo-runs for a customer or domain. Competitors = single source of truth for rank tracking and GEO. */
export const projects = pgTable(
    'projects',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(), // PLEXON user id when using central auth
        name: text('name').notNull(),
        domain: text('domain'),
        /** Optional sector label for filtering (e.g. healthcare, saas). */
        industry: text('industry'),
        valueProposition: text('value_proposition'),
        competitors: jsonb('competitors').notNull().default([]), // string[] – competitor domains
        /** GEO queries: legacy string[] or Record<marketKey, string[]> (e.g. "de-de"). See lib/geo-queries-by-market.ts */
        geoQueries: jsonb('geo_queries').notNull().default([]),
        /** Normalized tag strings (lowercase) for list filters. */
        tags: jsonb('tags').notNull().default([]),
        /** Last CHECKION research agent result (see lib/research/schema.ts). */
        researchSnapshot: jsonb('research_snapshot'),
        researchCapturedAt: timestamp('research_captured_at', { withTimezone: true }),
        /** Pinned ECHON v2 research thread UUID (market context for reports). */
        echonResearchThreadId: text('echon_research_thread_id'),
        /** Canonical PLEXON platform project id (mirror). */
        platformProjectId: text('platform_project_id'),
        platformCompanyId: text('platform_company_id'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
        platformProjectIdUnique: uniqueIndex('projects_platform_project_id_unique')
            .on(t.platformProjectId)
            // Multiple legacy rows have NULL platform id
            .where(sql`${t.platformProjectId} IS NOT NULL`),
    })
);

/** Explicit project memberships. `projects.user_id` remains the owner anchor. */
export const projectMembers = pgTable(
    'project_members',
    {
        projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
        userId: text('user_id').notNull(), // PLEXON user id when using central auth
        role: text('role').notNull().default(PROJECT_MEMBER_ROLE.MEMBER),
        status: text('status').notNull().default(PROJECT_MEMBER_STATUS.ACTIVE),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.projectId, t.userId] }),
        userProjectRoleIdx: index('project_members_user_project_role_idx').on(t.userId, t.projectId, t.role),
    })
);

/** Tracks which memberships are platform-managed so later resyncs only touch those rows. */
export const platformManagedProjectMemberships = pgTable(
    'platform_managed_project_memberships',
    {
        projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
        userId: text('user_id').notNull(),
        role: text('role').notNull().default(PROJECT_MEMBER_ROLE.MEMBER),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.projectId, t.userId] }),
    })
);

/** One multi-device standalone run (POST /api/scan); `id` matches `scans.group_id` for that batch. */
export const scanSessions = pgTable('scan_sessions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    standard: text('standard'),
    runners: jsonb('runners'),
    /** WCAG regional variant when set (e.g. DE). */
    targetRegion: text('target_region'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const scans = pgTable('scans', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(), // PLEXON user id when using central auth
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    device: text('device').notNull(),
    groupId: text('group_id'),
    /** When set, row belongs to {@link scanSessions} (standalone batch). Domain crawl pages keep this null. */
    scanSessionId: text('scan_session_id').references(() => scanSessions.id, { onDelete: 'set null' }),
    timestamp: text('timestamp').notNull(),
    result: jsonb('result').notNull(), // ScanResult
    llmSummary: jsonb('llm_summary'), // UxCxSummary | null
    resultSchemaVersion: integer('result_schema_version'),
    errorsCount: integer('errors_count'),
    warningsCount: integer('warnings_count'),
    noticesCount: integer('notices_count'),
    durationMs: integer('duration_ms'),
    score: integer('score'),
    /** Normalized filter tags (union with project.tags in list queries). */
    tags: jsonb('tags').notNull().default([]),
});

/** WCAG issues for a single `scans` row (mirror of `result.issues` for SQL / reporting). */
export const scanIssues = pgTable(
    'scan_issues',
    {
        id: text('id').primaryKey(),
        scanId: text('scan_id')
            .notNull()
            .references(() => scans.id, { onDelete: 'cascade' }),
        userId: text('user_id').notNull(),
        ordinal: integer('ordinal').notNull(),
        code: text('code').notNull(),
        type: text('type').notNull(),
        message: text('message').notNull(),
        context: text('context').notNull().default(''),
        selector: text('selector').notNull().default(''),
        runner: text('runner').notNull(),
        wcagLevel: text('wcag_level').notNull(),
        helpUrl: text('help_url'),
        boundingBox: jsonb('bounding_box'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
        scanOrdinalUniq: uniqueIndex('scan_issues_scan_ordinal_uniq').on(t.scanId, t.ordinal),
        scanIdIdx: index('scan_issues_scan_id_idx').on(t.scanId),
        userIdIdx: index('scan_issues_user_id_idx').on(t.userId),
        scanCodeIdx: index('scan_issues_scan_code_idx').on(t.scanId, t.code),
        scanTypeIdx: index('scan_issues_scan_type_idx').on(t.scanId, t.type),
    })
);

/**
 * Reuse of another user’s standalone session: no duplicate `scans` rows; `project_id` is the viewer’s project.
 */
export const standaloneScanEntitlements = pgTable(
    'standalone_scan_entitlements',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(),
        projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
        scanSessionId: text('scan_session_id')
            .notNull()
            .references(() => scanSessions.id, { onDelete: 'cascade' }),
        canonicalDesktopScanId: text('canonical_desktop_scan_id')
            .notNull()
            .references(() => scans.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
        userSessionUniq: uniqueIndex('standalone_scan_entitlements_user_session_uniq').on(t.userId, t.scanSessionId),
    })
);

export const domainScans = pgTable(
    'domain_scans',
    {
        id: text('id').primaryKey(),
        userId: text('user_id').notNull(), // PLEXON user id when using central auth
        projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
        domain: text('domain').notNull(),
        status: text('status').notNull(),
        timestamp: text('timestamp').notNull(),
        payload: jsonb('payload').notNull(), // DomainScanResult
        /** Stable key: user + project + normalized host; null on legacy rows until backfill (then coalesce with id in queries). */
        lineageKey: text('lineage_key'),
        /** Increments per re-scan for the same lineage_key; legacy rows default to 1. */
        lineageVersion: integer('lineage_version').notNull().default(1),
        /** Scan-level tags (normalized strings); union with project.tags for filters. */
        tags: jsonb('tags').notNull().default([]),
        /** Industry pool id (or legacy text); inferred from crawl rollup without requiring a project. */
        industry: text('industry'),
    },
    (t) => [
        uniqueIndex('domain_scans_lineage_key_version_uniq')
            .on(t.lineageKey, t.lineageVersion)
            .where(sql`${t.lineageKey} IS NOT NULL`),
    ]
);

/**
 * Domain scan pages (one row per URL).
 * Source of truth for paging and joining issues without loading domain_scans.payload.
 */
export const domainPages = pgTable('domain_pages', {
    id: text('id').primaryKey(),
    domainScanId: text('domain_scan_id').notNull().references(() => domainScans.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    url: text('url').notNull(),
    pageScanId: text('page_scan_id').references(() => scans.id, { onDelete: 'set null' }),
    device: text('device'),
    score: integer('score'),
    uxScore: integer('ux_score'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Domain scan issues (raw, high-volume). One row per issue occurrence on a page.
 * We keep groupKey to allow fast aggregation and stable group selection in the UI.
 */
export const domainPageIssues = pgTable('domain_page_issues', {
    id: text('id').primaryKey(),
    domainScanId: text('domain_scan_id').notNull().references(() => domainScans.id, { onDelete: 'cascade' }),
    domainPageId: text('domain_page_id').notNull().references(() => domainPages.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    groupKey: text('group_key').notNull(),
    type: text('type').notNull(), // 'error' | 'warning' | 'notice'
    code: text('code').notNull(),
    message: text('message').notNull(),
    runner: text('runner'),
    wcagLevel: text('wcag_level'),
    helpUrl: text('help_url'),
    selector: text('selector'),
    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Aggregated domain issue groups (domain-level) per scan.
 * pageCount counts distinct affected pages for the group.
 */
export const domainIssueGroups = pgTable('domain_issue_groups', {
    domainScanId: text('domain_scan_id').notNull().references(() => domainScans.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    groupKey: text('group_key').notNull(),
    type: text('type').notNull(),
    code: text('code').notNull(),
    message: text('message').notNull(),
    runner: text('runner'),
    wcagLevel: text('wcag_level'),
    helpUrl: text('help_url'),
    pageCount: integer('page_count').notNull().default(0),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.domainScanId, t.groupKey] }),
}));

/** Project → domain_scan references for competitor deep scans (standalone scans, referenced by project). One row per (project_id, domain). */
export const projectDomainScanReferences = pgTable('project_domain_scan_references', {
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
    domainScanId: text('domain_scan_id').notNull().references(() => domainScans.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.domain] }),
}));

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
    /** Shared slug across localized keyword rows (e.g. industrial-pumps). */
    intentKey: text('intent_key'),
    intentLabel: text('intent_label'),
    device: text('device'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Rank tracking: position history per keyword (1–100 or null if not in top 100). competitor_positions = domain -> position for project competitors (same SERP). serp_leader_* = organic #1 at snapshot time. */
export const rankTrackingPositions = pgTable('rank_tracking_positions', {
    id: text('id').primaryKey(),
    keywordId: text('keyword_id').notNull().references(() => rankTrackingKeywords.id, { onDelete: 'cascade' }),
    position: integer('position'), // 1–100 or null
    competitorPositions: jsonb('competitor_positions'), // Record<string, number | null> – domain -> position
    serpLeaderDomain: text('serp_leader_domain'),
    serpLeaderUrl: text('serp_leader_url'),
    /** SerpOrganicResult[] – titles, snippets, URLs for Google-style preview */
    serpOrganic: jsonb('serp_organic'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Project executive report generation runs (async bundle + optional LLM synthesis). */
export const projectReportRuns = pgTable('project_report_runs', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // 'queued' | 'running' | 'complete' | 'error'
    locale: text('locale').notNull().default('de'),
    variant: text('variant').notNull().default('executive'), // 'executive' | 'full' | 'comprehensive'
    bundle: jsonb('bundle'),
    /** Stage progress for long comprehensive reports: { stage, label, percent } */
    progress: jsonb('progress'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
});
