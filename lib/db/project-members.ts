import { and, eq } from 'drizzle-orm';
import { getDb } from './index';
import {
    platformManagedProjectMemberships,
    projectMembers,
    projects,
    PROJECT_MEMBER_ROLE,
    PROJECT_MEMBER_STATUS,
    type ProjectMemberRole,
} from './schema';

export type ProjectMembershipRow = {
    projectId: string;
    userId: string;
    role: ProjectMemberRole;
    status: string;
    createdAt: Date;
    updatedAt: Date;
};

export type ManagedProjectMembershipInput = {
    projectId: string;
    role: ProjectMemberRole;
};

function mapMembershipRow(row: typeof projectMembers.$inferSelect): ProjectMembershipRow {
    return {
        projectId: row.projectId,
        userId: row.userId,
        role: row.role as ProjectMemberRole,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function canManageProject(role: ProjectMemberRole | null | undefined): boolean {
    return role === PROJECT_MEMBER_ROLE.OWNER || role === PROJECT_MEMBER_ROLE.ADMIN;
}

export function canDeleteProject(role: ProjectMemberRole | null | undefined): boolean {
    return role === PROJECT_MEMBER_ROLE.OWNER;
}

export async function getProjectMembership(
    projectId: string,
    userId: string
): Promise<ProjectMembershipRow | null> {
    const db = getDb();
    const [row] = await db
        .select()
        .from(projectMembers)
        .where(
            and(
                eq(projectMembers.projectId, projectId),
                eq(projectMembers.userId, userId),
                eq(projectMembers.status, PROJECT_MEMBER_STATUS.ACTIVE)
            )
        )
        .limit(1);
    if (row) return mapMembershipRow(row);

    const [legacyOwnerProject] = await db
        .select({
            id: projects.id,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .limit(1);
    if (!legacyOwnerProject) return null;

    return {
        projectId,
        userId,
        role: PROJECT_MEMBER_ROLE.OWNER,
        status: PROJECT_MEMBER_STATUS.ACTIVE,
        createdAt: legacyOwnerProject.createdAt,
        updatedAt: legacyOwnerProject.updatedAt,
    };
}

export async function upsertProjectMember(
    projectId: string,
    userId: string,
    role: ProjectMemberRole
): Promise<void> {
    const db = getDb();
    const now = new Date();
    const [existing] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
        .limit(1);

    if (!existing) {
        await db.insert(projectMembers).values({
            projectId,
            userId,
            role,
            status: PROJECT_MEMBER_STATUS.ACTIVE,
            createdAt: now,
            updatedAt: now,
        });
        return;
    }

    if (existing.role !== role || existing.status !== PROJECT_MEMBER_STATUS.ACTIVE) {
        await db
            .update(projectMembers)
            .set({
                role,
                status: PROJECT_MEMBER_STATUS.ACTIVE,
                updatedAt: now,
            })
            .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
    }
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
    const db = getDb();
    await db
        .delete(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
}

export async function listPlatformManagedProjectMemberships(userId: string) {
    const db = getDb();
    return db
        .select()
        .from(platformManagedProjectMemberships)
        .where(eq(platformManagedProjectMemberships.userId, userId));
}

export async function replacePlatformManagedProjectMemberships(
    userId: string,
    items: ManagedProjectMembershipInput[]
): Promise<void> {
    const db = getDb();
    const now = new Date();

    await db.transaction(async (tx) => {
        const existingRows = await tx
            .select()
            .from(platformManagedProjectMemberships)
            .where(eq(platformManagedProjectMemberships.userId, userId));
        const existingMap = new Map(existingRows.map((row) => [row.projectId, row]));
        const nextProjectIds = new Set(items.map((item) => item.projectId));

        for (const item of items) {
            const existing = existingMap.get(item.projectId);
            const [existingMembership] = await tx
                .select()
                .from(projectMembers)
                .where(and(eq(projectMembers.projectId, item.projectId), eq(projectMembers.userId, userId)))
                .limit(1);

            if (!existingMembership) {
                await tx.insert(projectMembers).values({
                    projectId: item.projectId,
                    userId,
                    role: item.role,
                    status: PROJECT_MEMBER_STATUS.ACTIVE,
                    createdAt: now,
                    updatedAt: now,
                });
            } else if (
                existingMembership.role !== item.role ||
                existingMembership.status !== PROJECT_MEMBER_STATUS.ACTIVE
            ) {
                await tx
                    .update(projectMembers)
                    .set({
                        role: item.role,
                        status: PROJECT_MEMBER_STATUS.ACTIVE,
                        updatedAt: now,
                    })
                    .where(
                        and(
                            eq(projectMembers.projectId, item.projectId),
                            eq(projectMembers.userId, userId)
                        )
                    );
            }

            if (!existing) {
                await tx.insert(platformManagedProjectMemberships).values({
                    projectId: item.projectId,
                    userId,
                    role: item.role,
                    createdAt: now,
                    updatedAt: now,
                });
                continue;
            }

            if (existing.role !== item.role) {
                await tx
                    .update(platformManagedProjectMemberships)
                    .set({
                        role: item.role,
                        updatedAt: now,
                    })
                    .where(
                        and(
                            eq(platformManagedProjectMemberships.projectId, item.projectId),
                            eq(platformManagedProjectMemberships.userId, userId)
                        )
                    );
            }
        }

        for (const existing of existingRows) {
            if (!nextProjectIds.has(existing.projectId)) {
                const [membership] = await tx
                    .select()
                    .from(projectMembers)
                    .where(
                        and(
                            eq(projectMembers.projectId, existing.projectId),
                            eq(projectMembers.userId, userId),
                            eq(projectMembers.status, PROJECT_MEMBER_STATUS.ACTIVE)
                        )
                    )
                    .limit(1);
                if (membership?.role !== PROJECT_MEMBER_ROLE.OWNER) {
                    await tx
                        .delete(projectMembers)
                        .where(
                            and(
                                eq(projectMembers.projectId, existing.projectId),
                                eq(projectMembers.userId, userId)
                            )
                        );
                }
                await tx
                    .delete(platformManagedProjectMemberships)
                    .where(
                        and(
                            eq(platformManagedProjectMemberships.projectId, existing.projectId),
                            eq(platformManagedProjectMemberships.userId, userId)
                        )
                    );
            }
        }
    });
}
