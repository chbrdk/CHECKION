/* ------------------------------------------------------------------ */
/*  CHECKION – Projects (DB)                                          */
/* ------------------------------------------------------------------ */

import { eq, and, desc, or } from 'drizzle-orm';
import { getDb } from './index';
import { getProjectMembership, canDeleteProject, canManageProject } from './project-members';
import { projects, projectMembers, PROJECT_MEMBER_ROLE, PROJECT_MEMBER_STATUS, type ProjectMemberRole } from './schema';
import { normalizeTagList } from '@/lib/tag-utils';
import { normalizeStoredProjectIndustry } from '@/lib/industry-pool';
import { flattenGeoQueries, normalizeGeoQueriesToByMarket, type GeoQueriesByMarket } from '@/lib/geo-queries-by-market';

export interface ProjectRow {
    id: string;
    userId: string;
    name: string;
    domain: string | null;
    industry: string | null;
    valueProposition: string | null;
    competitors: string[];
    geoQueries: string[];
    geoQueriesByMarket: GeoQueriesByMarket;
    tags: string[];
    membershipRole?: ProjectMemberRole;
    createdAt: Date;
    updatedAt: Date;
}

function mapProjectRow(row: Record<string, unknown>): ProjectRow {
    const r = row as unknown as ProjectRow & {
        competitors?: unknown;
        geoQueries?: unknown;
        tags?: unknown;
        membershipRole?: unknown;
    };
    return {
        id: r.id,
        userId: r.userId,
        name: r.name,
        domain: r.domain ?? null,
        industry: r.industry ?? null,
        valueProposition: r.valueProposition ?? null,
        competitors: Array.isArray(r.competitors) ? (r.competitors as string[]) : [],
        geoQueries: flattenGeoQueries(r.geoQueries),
        geoQueriesByMarket: normalizeGeoQueriesToByMarket(r.geoQueries),
        tags: normalizeTagList(r.tags),
        membershipRole: typeof r.membershipRole === 'string' ? (r.membershipRole as ProjectMemberRole) : undefined,
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
        geoQueries?: string[] | GeoQueriesByMarket;
        tags?: string[];
        platformProjectId?: string | null;
        platformCompanyId?: string | null;
    }
): Promise<void> {
    const db = getDb();
    const now = new Date();
    const competitors = Array.isArray(data.competitors) ? data.competitors : [];
    const geoQueries =
        data.geoQueries != null && !Array.isArray(data.geoQueries)
            ? data.geoQueries
            : Array.isArray(data.geoQueries)
              ? data.geoQueries
              : [];
    const tags = normalizeTagList(data.tags ?? []);
    await db.transaction(async (tx) => {
        await tx.insert(projects).values({
            id,
            userId,
            name: data.name,
            domain: data.domain ?? null,
            industry: normalizeStoredProjectIndustry(data.industry ?? undefined),
            valueProposition: data.valueProposition ?? null,
            competitors,
            geoQueries,
            tags,
            platformProjectId: data.platformProjectId ?? null,
            platformCompanyId: data.platformCompanyId ?? null,
            createdAt: now,
            updatedAt: now,
        });
        await tx.insert(projectMembers).values({
            projectId: id,
            userId,
            role: PROJECT_MEMBER_ROLE.OWNER,
            status: PROJECT_MEMBER_STATUS.ACTIVE,
            createdAt: now,
            updatedAt: now,
        });
    });
}

export async function getProjectPlatformIds(
    projectId: string
): Promise<{ platformProjectId: string | null; platformCompanyId: string | null } | null> {
    const db = getDb();
    const [row] = await db
        .select({
            platformProjectId: projects.platformProjectId,
            platformCompanyId: projects.platformCompanyId,
        })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
    if (!row) return null;
    return {
        platformProjectId: row.platformProjectId ?? null,
        platformCompanyId: row.platformCompanyId ?? null,
    };
}

export async function getProjectRowByPlatformProjectId(platformProjectId: string) {
    const db = getDb();
    const [row] = await db
        .select()
        .from(projects)
        .where(eq(projects.platformProjectId, platformProjectId))
        .limit(1);
    return row ?? null;
}

export async function getProject(id: string, userId: string): Promise<ProjectRow | null> {
    const db = getDb();
    const rows = await db
        .select({
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
            membershipRole: projectMembers.role,
        })
        .from(projects)
        .leftJoin(
            projectMembers,
            and(
                eq(projectMembers.projectId, projects.id),
                eq(projectMembers.userId, userId),
                eq(projectMembers.status, PROJECT_MEMBER_STATUS.ACTIVE)
            )
        )
        .where(and(eq(projects.id, id), or(eq(projects.userId, userId), eq(projectMembers.userId, userId))))
        .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0] as Record<string, unknown> & { userId: string; membershipRole?: string | null };
    return mapProjectRow({
        ...row,
        membershipRole: row.membershipRole ?? (row.userId === userId ? PROJECT_MEMBER_ROLE.OWNER : undefined),
    });
}

export async function listProjects(userId: string): Promise<ProjectRow[]> {
    const db = getDb();
    const rows = await db
        .select({
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
            membershipRole: projectMembers.role,
        })
        .from(projects)
        .leftJoin(
            projectMembers,
            and(
                eq(projectMembers.projectId, projects.id),
                eq(projectMembers.userId, userId),
                eq(projectMembers.status, PROJECT_MEMBER_STATUS.ACTIVE)
            )
        )
        .where(or(eq(projects.userId, userId), eq(projectMembers.userId, userId)))
        .orderBy(desc(projects.updatedAt));
    return rows.map((row) => {
        const mapped = row as Record<string, unknown> & { userId: string; membershipRole?: string | null };
        return mapProjectRow({
            ...mapped,
            membershipRole:
                mapped.membershipRole ?? (mapped.userId === userId ? PROJECT_MEMBER_ROLE.OWNER : undefined),
        });
    });
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
        geoQueries?: string[] | GeoQueriesByMarket;
        tags?: string[];
    }
): Promise<boolean> {
    const db = getDb();
    const membership = await getProjectMembership(id, userId);
    if (!canManageProject(membership?.role)) {
        return false;
    }
    const updated = await db
        .update(projects)
        .set({
            ...(data.name !== undefined && { name: data.name }),
            ...(data.domain !== undefined && { domain: data.domain }),
            ...(data.industry !== undefined && { industry: normalizeStoredProjectIndustry(data.industry ?? undefined) }),
            ...(data.valueProposition !== undefined && { valueProposition: data.valueProposition }),
            ...(data.competitors !== undefined && { competitors: data.competitors }),
            ...(data.geoQueries !== undefined && { geoQueries: data.geoQueries }),
            ...(data.tags !== undefined && { tags: normalizeTagList(data.tags) }),
            updatedAt: new Date(),
        })
        .where(eq(projects.id, id));
    return (updated.rowCount ?? 0) > 0;
}

export async function deleteProject(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const membership = await getProjectMembership(id, userId);
    if (!canDeleteProject(membership?.role)) {
        return false;
    }
    const deleted = await db
        .delete(projects)
        .where(eq(projects.id, id));
    return (deleted.rowCount ?? 0) > 0;
}
