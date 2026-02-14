/* ------------------------------------------------------------------ */
/*  CHECKION – NextAuth v5 (Auth.js) with Credentials                 */
/* ------------------------------------------------------------------ */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const AUTH_SECRET = process.env.AUTH_SECRET;
if (process.env.NODE_ENV === 'production' && (!AUTH_SECRET || AUTH_SECRET.length < 32)) {
    console.error('[CHECKION] AUTH_SECRET is missing or too short (min 32 chars). Set AUTH_SECRET in production.');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    secret: AUTH_SECRET || undefined,
    trustHost: true,
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                try {
                    const email = String(credentials.email).trim().toLowerCase();
                    const db = getDb();
                    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
                    if (!user) return null;
                    const ok = await bcrypt.compare(String(credentials.password), user.passwordHash);
                    if (!ok) return null;
                    return { id: user.id, email: user.email, name: user.name ?? undefined };
                } catch (e) {
                    console.error('[CHECKION] authorize error:', e);
                    return null;
                }
            },
        }),
    ],
    session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
    pages: { signIn: '/login' },
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub!;
                session.user.email = token.email ?? '';
                session.user.name = token.name ?? null;
            }
            return session;
        },
    },
});
