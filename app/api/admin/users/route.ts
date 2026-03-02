/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/admin/users (list all users, admin API key)    */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { isAdminApiRequest } from '@/lib/auth-admin-api';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET(request: Request) {
  if (!isAdminApiRequest(request)) {
    return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  }
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      company: users.company,
      locale: users.locale,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
  return NextResponse.json({
    data: rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name ?? undefined,
      company: u.company ?? undefined,
      locale: u.locale ?? undefined,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
