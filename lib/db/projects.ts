/* ------------------------------------------------------------------ */
/*  CHECKION – Projects (DB)                                          */
/* ------------------------------------------------------------------ */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index';
import { projects } from './schema';

export interface ProjectRow {
    id: string;
    userId: string;
    name: string;
    domain: string | null;
    valueProposition: string | null;
    competitors: string[];
    geoQueries: string[];
    createdAt: Date;
    updatedAt: Date;
}

export async function insertProject(
    id: string,
    userId: string,
    data: { name: string; domain?: string | null; valueProposition?: string | null; competitors?: string[]; geoQueries?: string[] }
): Promise<void> {
    const db = getDb();
    const now = new Date();
    const competitors = Array.isArray(data.competitors) ? data.competitors : [];
    const geoQueries = Array.isArray(data.geoQueries) ? data.geoQueries : [];
    await db.insert(projects).values({
        id,
        userId,
        name: data.name,
        domain: data.domain ?? null,
        valueProposition: data.valueProposition ?? null,
        competitors,
        geoQueries,
        createdAt: now,
        updatedAt: now,
    });
}

export async function getProject(id: string, userId: string): Promise<ProjectRow | null> {
    const db = getDb();
    const rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0] as ProjectRow & { competitors?: unknown; geoQueries?: unknown; valueProposition?: string | null };
    return {
        ...row,
        valueProposition: row.valueProposition ?? null,
        competitors: Array.isArray(row.competitors) ? row.competitors : [],
        geoQueries: Array.isArray(row.geoQueries) ? row.geoQueries : [],
    } as ProjectRow;
}

export async function listProjects(userId: string): Promise<ProjectRow[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));
    return rows.map((row) => {
        const r = row as ProjectRow & { competitors?: unknown; geoQueries?: unknown; valueProposition?: string | null };
        return {
            ...r,
            valueProposition: r.valueProposition ?? null,
            competitors: Array.isArray(r.competitors) ? r.competitors : [],
            geoQueries: Array.isArray(r.geoQueries) ? r.geoQueries : [],
        } as ProjectRow;
    });
}

export async function updateProject(
    id: string,
    userId: string,
    data: { name?: string; domain?: string | null; valueProposition?: string | null; competitors?: string[]; geoQueries?: string[] }
): Promise<boolean> {
    const db = getDb();
    const updated = await db
        .update(projects)
        .set({
            ...(data.name !== undefined && { name: data.name }),
            ...(data.domain !== undefined && { domain: data.domain }),
            ...(data.valueProposition !== undefined && { valueProposition: data.valueProposition }),
            ...(data.competitors !== undefined && { competitors: data.competitors }),
            ...(data.geoQueries !== undefined && { geoQueries: data.geoQueries }),
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
