/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/auth/register                                */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
    if (!process.env.DATABASE_URL) {
        console.error('[CHECKION] DATABASE_URL is not set');
        return NextResponse.json(
            { error: 'Server misconfiguration: database not configured.' },
            { status: 503 }
        );
    }
    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const name = typeof body.name === 'string' ? body.name.trim() : null;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        const db = getDb();
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (existing.length > 0) {
            return NextResponse.json({ error: 'Email already registered.' }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const id = randomUUID();
        await db.insert(users).values({
            id,
            email,
            passwordHash,
            name: name || null,
        });

        return NextResponse.json({ success: true, userId: id });
    } catch (e) {
        console.error('[CHECKION] Register failed:', e);
        return NextResponse.json({ error: 'Registration failed.' }, { status: 500 });
    }
}
