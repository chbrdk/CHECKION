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
    createdAt: Date;
    updatedAt: Date;
}

export async function insertProject(
    id: string,
    userId: string,
    data: { name: string; domain?: string | null }
): Promise<void> {
    const db = getDb();
    const now = new Date();
    await db.insert(projects).values({
        id,
        userId,
        name: data.name,
        domain: data.domain ?? null,
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
    return rows.length > 0 ? (rows[0] as ProjectRow) : null;
}

export async function listProjects(userId: string): Promise<ProjectRow[]> {
    const db = getDb();
    const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));
    return rows as ProjectRow[];
}

export async function updateProject(
    id: string,
    userId: string,
    data: { name?: string; domain?: string | null }
): Promise<boolean> {
    const db = getDb();
    const updated = await db
        .update(projects)
        .set({
            ...(data.name !== undefined && { name: data.name }),
            ...(data.domain !== undefined && { domain: data.domain }),
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
