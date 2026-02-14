/* ------------------------------------------------------------------ */
/*  CHECKION – GET/PATCH /api/auth/profile (authenticated user)       */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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
        .where(eq(users.id, session.user.id))
        .limit(1);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
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

export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const name = typeof body.name === 'string' ? body.name.trim() || null : undefined;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    const company = typeof body.company === 'string' ? body.company.trim() || null : undefined;
    const avatar_url = typeof body.avatar_url === 'string' ? body.avatar_url.trim() || null : body.avatar_url === null ? null : undefined;
    const locale = typeof body.locale === 'string' ? body.locale.trim() || null : undefined;

    const db = getDb();
    if (email !== undefined) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
        }
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (existing.length > 0 && existing[0].id !== session.user.id) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }
    }

    const updates: Record<string, string | null> = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (company !== undefined) updates.company = company;
    if (avatar_url !== undefined) updates.avatarUrl = avatar_url;
    if (locale !== undefined) updates.locale = locale;

    if (Object.keys(updates).length === 0) {
        const [u] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
        if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
        .where(eq(users.id, session.user.id))
        .returning({
            id: users.id,
            email: users.email,
            name: users.name,
            company: users.company,
            avatarUrl: users.avatarUrl,
            locale: users.locale,
        });
    if (!updated) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
