/* ------------------------------------------------------------------ */
/*  CHECKION – GET/PATCH /api/auth/profile (authenticated user)       */
/* ------------------------------------------------------------------ */
/* Mit PLEXON_AUTH_URL: Profil aus PLEXON lesen/schreiben (Name, Firma, Avatar, Sprache). */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isPlexonAuthConfigured, getPlexonProfile, getPlexonProfileByEmail, patchPlexonProfile } from '@/lib/plexon-auth';

/** Minimales Profil aus Session (nur wenn PLEXON nicht konfiguriert und lokale DB fehlt). */
async function minimalProfile(id: string) {
    const session = await auth();
    const u = session?.user;
    return NextResponse.json({
        user: {
            id,
            email: (u?.email as string | undefined) ?? undefined,
            name: (u?.name as string | undefined) ?? undefined,
            company: undefined,
            avatar_url: undefined,
            locale: undefined,
        },
    });
}

export async function GET(request: Request) {
    const requestUser = await getRequestUser(request);
    if (!requestUser) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    if (isPlexonAuthConfigured()) {
        let profile = await getPlexonProfile(requestUser.id);
        if (!profile) {
            const session = await auth();
            const email = session?.user?.email;
            if (typeof email === 'string') {
                profile = await getPlexonProfileByEmail(email);
            }
        }
        if (profile) {
            return NextResponse.json({ user: profile });
        }
        return apiError('Profile service unavailable. Ensure PLEXON is reachable and user exists in PLEXON.', 503);
    }
    try {
        const db = getDb();
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                company: users.company,
                avatarUrl: users.avatarUrl,
                locale: users.locale,
            })
            .from(users)
            .where(eq(users.id, requestUser.id))
            .limit(1);
        if (user) {
            return NextResponse.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name ?? undefined,
                    company: user.company ?? undefined,
                    avatar_url: user.avatarUrl ?? undefined,
                    locale: user.locale ?? undefined,
                },
            });
        }
    } catch {
        /* DATABASE_URL fehlt oder DB-Fehler: minimales Profil nur wenn PLEXON nicht im Einsatz */
    }
    return await minimalProfile(requestUser.id);
}

export async function PATCH(request: Request) {
    const requestUser = await getRequestUser(request);
    if (!requestUser) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
    }
    const name = typeof body.name === 'string' ? body.name.trim() || null : undefined;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    const company = typeof body.company === 'string' ? body.company.trim() || null : undefined;
    const avatar_url = typeof body.avatar_url === 'string' ? body.avatar_url.trim() || null : body.avatar_url === null ? null : undefined;
    const locale = typeof body.locale === 'string' ? body.locale.trim() || null : undefined;

    if (isPlexonAuthConfigured()) {
        const updated = await patchPlexonProfile(requestUser.id, { name, email, company, avatar_url, locale });
        if (updated) {
            return NextResponse.json({ user: updated });
        }
        return apiError('Profile service unavailable. Ensure PLEXON is reachable.', 503);
    }

    const db = getDb();
    if (email !== undefined) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return apiError('Invalid email', API_STATUS.BAD_REQUEST);
        }
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (existing.length > 0 && existing[0].id !== requestUser.id) {
            return apiError('Email already in use', API_STATUS.CONFLICT);
        }
    }

    const updates: Record<string, string | null> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (company !== undefined) updates.company = company;
    if (avatar_url !== undefined) updates.avatarUrl = avatar_url;
    if (locale !== undefined) updates.locale = locale;

    if (Object.keys(updates).length === 0) {
        const [u] = await db.select().from(users).where(eq(users.id, requestUser.id)).limit(1);
        if (!u) return apiError('User not found', API_STATUS.NOT_FOUND);
        return NextResponse.json({
            user: {
                id: u.id,
                email: u.email,
                name: u.name ?? undefined,
                company: u.company ?? undefined,
                avatar_url: u.avatarUrl ?? undefined,
                locale: u.locale ?? undefined,
            },
        });
    }

    const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, requestUser.id))
        .returning({
            id: users.id,
            email: users.email,
            name: users.name,
            company: users.company,
            avatarUrl: users.avatarUrl,
            locale: users.locale,
        });
    if (!updated) {
        return apiError('User not found', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json({
        user: {
            id: updated.id,
            email: updated.email,
            name: updated.name ?? undefined,
            company: updated.company ?? undefined,
            avatar_url: updated.avatarUrl ?? undefined,
            locale: updated.locale ?? undefined,
        },
    });
}
