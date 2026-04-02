import { and, eq, sql, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { domainIssueGroups, domainPageIssues, domainPages } from '@/lib/db/schema';
import type { Issue, ScanResult } from '@/lib/types';
import { buildDomainIssueGroupKey } from '@/lib/domain-issues-group-key';

function chunk<T>(arr: T[], size: number): T[][] {
    if (arr.length === 0) return [];
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

function stableId(prefix: string, seed: string): string {
    // Keep id short but deterministic; text PK is fine.
    const h = buildDomainIssueGroupKey({ code: prefix, type: 'id', message: seed });
    return `${prefix}_${h}`;
}

export async function rebuildDomainIssuesFromPages(params: {
    userId: string;
    domainScanId: string;
    pages: ScanResult[];
}): Promise<{ pageCount: number; issueCount: number; groupCount: number }> {
    const db = getDb();
    const { userId, domainScanId, pages } = params;

    // Full rebuild is acceptable (eventual consistency) and keeps logic simple + safe.
    await db.transaction(async (tx) => {
        await tx.delete(domainIssueGroups).where(and(eq(domainIssueGroups.domainScanId, domainScanId), eq(domainIssueGroups.userId, userId)));
        await tx.delete(domainPageIssues).where(and(eq(domainPageIssues.domainScanId, domainScanId), eq(domainPageIssues.userId, userId)));
        await tx.delete(domainPages).where(and(eq(domainPages.domainScanId, domainScanId), eq(domainPages.userId, userId)));

        const pageRows = pages.map((p) => {
            const domainPageId = stableId('dp', `${domainScanId}|${p.url}`);
            return {
                id: domainPageId,
                domainScanId,
                userId,
                url: p.url,
                pageScanId: p.id,
                device: p.device,
                score: typeof p.score === 'number' ? p.score : null,
                uxScore: typeof p.ux?.score === 'number' ? Math.round(p.ux.score) : null,
            };
        });

        for (const c of chunk(pageRows, 500)) {
            await tx.insert(domainPages).values(c);
        }

        const issueRows: Array<{
            id: string;
            domainScanId: string;
            domainPageId: string;
            userId: string;
            groupKey: string;
            type: string;
            code: string;
            message: string;
            runner: string | null;
            wcagLevel: string | null;
            helpUrl: string | null;
            selector: string | null;
            meta: Record<string, unknown> | null;
        }> = [];

        for (const p of pages) {
            const domainPageId = stableId('dp', `${domainScanId}|${p.url}`);
            for (let idx = 0; idx < (p.issues ?? []).length; idx++) {
                const issue = (p.issues ?? [])[idx] as Issue;
                const groupKey = buildDomainIssueGroupKey({ code: issue.code, type: issue.type, message: issue.message });
                issueRows.push({
                    id: stableId('dpi', `${domainPageId}|${groupKey}|${issue.selector ?? ''}|${idx}`),
                    domainScanId,
                    domainPageId,
                    userId,
                    groupKey,
                    type: issue.type,
                    code: issue.code,
                    message: issue.message,
                    runner: issue.runner ?? null,
                    wcagLevel: issue.wcagLevel ?? null,
                    helpUrl: issue.helpUrl ?? null,
                    selector: issue.selector ?? null,
                    meta: issue.boundingBox ? { boundingBox: issue.boundingBox } : null,
                });
            }
        }

        for (const c of chunk(issueRows, 1000)) {
            await tx.insert(domainPageIssues).values(
                c.map((r) => ({
                    ...r,
                    runner: r.runner ?? undefined,
                    wcagLevel: r.wcagLevel ?? undefined,
                    helpUrl: r.helpUrl ?? undefined,
                    selector: r.selector ?? undefined,
                    meta: (r.meta ?? undefined) as any,
                }))
            );
        }

        // Aggregate into domain_issue_groups (distinct pages per group).
        // eslint-disable-next-line drizzle/enforce-delete-with-where
        await tx.execute(sql`
          INSERT INTO "domain_issue_groups"
            ("domain_scan_id","user_id","group_key","type","code","message","runner","wcag_level","help_url","page_count","first_seen_at","updated_at")
          SELECT
            "domain_scan_id",
            "user_id",
            "group_key",
            "type",
            "code",
            "message",
            max("runner") as "runner",
            max("wcag_level") as "wcag_level",
            max("help_url") as "help_url",
            count(distinct "domain_page_id")::int as "page_count",
            min("created_at") as "first_seen_at",
            now() as "updated_at"
          FROM "domain_page_issues"
          WHERE "domain_scan_id" = ${domainScanId} AND "user_id" = ${userId}
          GROUP BY "domain_scan_id","user_id","group_key","type","code","message"
          ON CONFLICT ("domain_scan_id","group_key")
          DO UPDATE SET
            "page_count" = excluded."page_count",
            "updated_at" = now();
        `);
    });

    const db2 = getDb();
    const groupRows = await db2
        .select({ count: sql<number>`count(*)::int` })
        .from(domainIssueGroups)
        .where(and(eq(domainIssueGroups.domainScanId, domainScanId), eq(domainIssueGroups.userId, userId)));
    return { pageCount: pages.length, issueCount: pages.reduce((a, p) => a + (p.issues?.length ?? 0), 0), groupCount: Number(groupRows[0]?.count ?? 0) };
}

export async function listIssueGroupsPaged(params: {
    userId: string;
    domainScanId: string;
    limit: number;
    cursor?: { pageCount: number; groupKey: string } | null;
    type?: string | null;
    wcagLevel?: string | null;
    q?: string | null;
}): Promise<{ data: Array<{ groupKey: string; type: string; code: string; message: string; runner: string | null; wcagLevel: string | null; helpUrl: string | null; pageCount: number }>; nextCursor: { pageCount: number; groupKey: string } | null }> {
    const db = getDb();
    const where = [
        eq(domainIssueGroups.domainScanId, params.domainScanId),
        eq(domainIssueGroups.userId, params.userId),
    ];
    if (params.type) where.push(eq(domainIssueGroups.type, params.type));
    if (params.wcagLevel) where.push(eq(domainIssueGroups.wcagLevel, params.wcagLevel));
    if (params.q) {
        where.push(
            sql`("domain_issue_groups"."message" ILIKE ${'%' + params.q + '%'} OR "domain_issue_groups"."code" ILIKE ${'%' + params.q + '%'})`
        );
    }
    if (params.cursor) {
        where.push(
            sql`("domain_issue_groups"."page_count" < ${params.cursor.pageCount}
              OR ("domain_issue_groups"."page_count" = ${params.cursor.pageCount} AND "domain_issue_groups"."group_key" > ${params.cursor.groupKey}))`
        );
    }

    const rows = await db
        .select({
            groupKey: domainIssueGroups.groupKey,
            type: domainIssueGroups.type,
            code: domainIssueGroups.code,
            message: domainIssueGroups.message,
            runner: domainIssueGroups.runner,
            wcagLevel: domainIssueGroups.wcagLevel,
            helpUrl: domainIssueGroups.helpUrl,
            pageCount: domainIssueGroups.pageCount,
        })
        .from(domainIssueGroups)
        .where(and(...where))
        .orderBy(desc(domainIssueGroups.pageCount), domainIssueGroups.groupKey)
        .limit(params.limit + 1);

    const hasMore = rows.length > params.limit;
    const data = (hasMore ? rows.slice(0, params.limit) : rows).map((r) => ({
        ...r,
        runner: r.runner ?? null,
        wcagLevel: r.wcagLevel ?? null,
        helpUrl: r.helpUrl ?? null,
        pageCount: r.pageCount ?? 0,
    }));
    const last = data[data.length - 1];
    return {
        data,
        nextCursor: hasMore && last ? { pageCount: last.pageCount, groupKey: last.groupKey } : null,
    };
}

export async function listGroupPagesPaged(params: {
    userId: string;
    domainScanId: string;
    groupKey: string;
    limit: number;
    cursor?: { url: string } | null;
}): Promise<{ data: Array<{ pageId: string; url: string; issueCount: number }>; nextCursor: { url: string } | null }> {
    const db = getDb();
    const where = [
        eq(domainPageIssues.domainScanId, params.domainScanId),
        eq(domainPageIssues.userId, params.userId),
        eq(domainPageIssues.groupKey, params.groupKey),
    ];
    if (params.cursor?.url) {
        where.push(sql`"domain_pages"."url" > ${params.cursor.url}`);
    }
    const rows = await db
        .select({
            pageId: domainPages.id,
            url: domainPages.url,
            issueCount: sql<number>`count(*)::int`,
        })
        .from(domainPageIssues)
        .innerJoin(domainPages, eq(domainPages.id, domainPageIssues.domainPageId))
        .where(and(...where))
        .groupBy(domainPages.id, domainPages.url)
        .orderBy(domainPages.url)
        .limit(params.limit + 1);

    const hasMore = rows.length > params.limit;
    const data = hasMore ? rows.slice(0, params.limit) : rows;
    const last = data[data.length - 1];
    return {
        data: data.map((r) => ({ ...r, issueCount: Number(r.issueCount ?? 0) })),
        nextCursor: hasMore && last ? { url: last.url } : null,
    };
}

export async function listPageIssuesPaged(params: {
    userId: string;
    domainScanId: string;
    pageId: string;
    limit: number;
    cursor?: { id: string } | null;
}): Promise<{ data: Array<{ id: string; groupKey: string; type: string; code: string; message: string; runner: string | null; wcagLevel: string | null; helpUrl: string | null; selector: string | null }>; nextCursor: { id: string } | null }> {
    const db = getDb();
    const where = [
        eq(domainPageIssues.domainScanId, params.domainScanId),
        eq(domainPageIssues.userId, params.userId),
        eq(domainPageIssues.domainPageId, params.pageId),
    ];
    if (params.cursor?.id) where.push(sql`"domain_page_issues"."id" > ${params.cursor.id}`);

    const rows = await db
        .select({
            id: domainPageIssues.id,
            groupKey: domainPageIssues.groupKey,
            type: domainPageIssues.type,
            code: domainPageIssues.code,
            message: domainPageIssues.message,
            runner: domainPageIssues.runner,
            wcagLevel: domainPageIssues.wcagLevel,
            helpUrl: domainPageIssues.helpUrl,
            selector: domainPageIssues.selector,
        })
        .from(domainPageIssues)
        .where(and(...where))
        .orderBy(domainPageIssues.id)
        .limit(params.limit + 1);

    const hasMore = rows.length > params.limit;
    const data = hasMore ? rows.slice(0, params.limit) : rows;
    const last = data[data.length - 1];
    return {
        data: data.map((r) => ({
            ...r,
            runner: r.runner ?? null,
            wcagLevel: r.wcagLevel ?? null,
            helpUrl: r.helpUrl ?? null,
            selector: r.selector ?? null,
        })),
        nextCursor: hasMore && last ? { id: last.id } : null,
    };
}

