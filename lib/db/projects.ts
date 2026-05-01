/* ------------------------------------------------------------------ */
/*  CHECKION – Projects (DB)                                          */
/* ------------------------------------------------------------------ */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index';
import { projects } from './schema';
import { normalizeIndustry, normalizeTagList } from '@/lib/tag-utils';

export interface ProjectRow {
    id: string;
    userId: string;
    name: string;
    domain: string | null;
    industry: string | null;
    valueProposition: string | null;
    competitors: string[];
    geoQueries: string[];
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

function mapProjectRow(row: Record<string, unknown>): ProjectRow {
    const r = row as unknown as ProjectRow & { competitors?: unknown; geoQueries?: unknown; tags?: unknown };
    return {
        id: r.id,
        userId: r.userId,
        name: r.name,
        domain: r.domain ?? null,
        industry: r.industry ?? null,
        valueProposition: r.valueProposition ?? null,
        competitors: Array.isArray(r.competitors) ? (r.competitors as string[]) : [],
        geoQueries: Array.isArray(r.geoQueries) ? (r.geoQueries as string[]) : [],
        tags: normalizeTagList(r.tags),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}

export async function insertProject(
    id: string,
    userId: string,
    data: {
        name: string;
        domain?: string | null;
        industry?: string | null;
        valueProposition?: string | null;
        competitors?: string[];
        geoQueries?: string[];
        tags?: string[];
    }
): Promise<void> {
    const db = getDb();
    const now = new Date();
    const competitors = Array.isArray(data.competitors) ? data.competitors : [];
    const geoQueries = Array.isArray(data.geoQueries) ? data.geoQueries : [];
    const tags = normalizeTagList(data.tags ?? []);
    await db.insert(projects).values({
        id,
        userId,
        name: data.name,
        domain: data.domain ?? null,
        industry: normalizeIndustry(data.industry ?? undefined),
        valueProposition: data.valueProposition ?? null,
        competitors,
        geoQueries,
        tags,
        createdAt: now,
        updatedAt: now,
    });
}

const projectRowSelect = {
    id: projects.id,
    userId: projects.userId,
    name: projects.name,
    domain: projects.domain,
    industry: projects.industry,
    valueProposition: projects.valueProposition,
    competitors: projects.competitors,
    geoQueries: projects.geoQueries,
    tags: projects.tags,
    createdAt: projects.createdAt,
    updatedAt: projects.updatedAt,
} as const;

export async function getProject(id: string, userId: string): Promise<ProjectRow | null> {
    const db = getDb();
    const rows = await db
        .select(projectRowSelect)
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);
    if (rows.length === 0) return null;
    return mapProjectRow(rows[0] as Record<string, unknown>);
}

export async function listProjects(userId: string): Promise<ProjectRow[]> {
    const db = getDb();
    const rows = await db
        .select(projectRowSelect)
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));
    return rows.map((row) => mapProjectRow(row as Record<string, unknown>));
}

export async function updateProject(
    id: string,
    userId: string,
    data: {
        name?: string;
        domain?: string | null;
        industry?: string | null;
        valueProposition?: string | null;
        competitors?: string[];
        geoQueries?: string[];
        tags?: string[];
    }
): Promise<boolean> {
    const db = getDb();
    const updated = await db
        .update(projects)
        .set({
            ...(data.name !== undefined && { name: data.name }),
            ...(data.domain !== undefined && { domain: data.domain }),
            ...(data.industry !== undefined && { industry: normalizeIndustry(data.industry ?? undefined) }),
            ...(data.valueProposition !== undefined && { valueProposition: data.valueProposition }),
            ...(data.competitors !== undefined && { competitors: data.competitors }),
            ...(data.geoQueries !== undefined && { geoQueries: data.geoQueries }),
            ...(data.tags !== undefined && { tags: normalizeTagList(data.tags) }),
            updatedAt: new Date(),
        })
        .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

export async function deleteProject(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return (deleted.rowCount ?? 0) > 0;
}
