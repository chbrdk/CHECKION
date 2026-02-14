/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/auth/change-password                          */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let body: { current_password?: string; new_password?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const currentPassword = typeof body.current_password === 'string' ? body.current_password : '';
    const newPassword = typeof body.new_password === 'string' ? body.new_password : '';
    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Current and new password required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
        return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const db = getDb();
    const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, session.user.id)).limit(1);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.update(users).set({ passwordHash }).where(eq(users.id, session.user.id));
    return NextResponse.json({ success: true });
}
