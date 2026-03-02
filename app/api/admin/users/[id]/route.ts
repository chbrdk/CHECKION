/* ------------------------------------------------------------------ */
/*  CHECKION – GET/PATCH/DELETE /api/admin/users/[id] (admin API key) */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { isAdminApiRequest } from '@/lib/auth-admin-api';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminApiRequest(_request)) {
    return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  }
  const { id } = await params;
  if (!id) return apiError('User ID required', API_STATUS.BAD_REQUEST);
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      company: users.company,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user) return apiError('User not found', API_STATUS.NOT_FOUND);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      company: user.company ?? undefined,
      avatar_url: user.avatarUrl ?? undefined,
      locale: user.locale ?? undefined,
      createdAt: user.createdAt.toISOString(),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminApiRequest(request)) {
    return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  }
  const { id } = await params;
  if (!id) return apiError('User ID required', API_STATUS.BAD_REQUEST);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }
  const name = typeof body.name === 'string' ? body.name.trim() || null : undefined;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
  const company = typeof body.company === 'string' ? body.company.trim() || null : undefined;
  const avatar_url =
    typeof body.avatar_url === 'string'
      ? body.avatar_url.trim() || null
      : body.avatar_url === null
        ? null
        : undefined;
  const locale = typeof body.locale === 'string' ? body.locale.trim() || null : undefined;

  const db = getDb();
  if (email !== undefined) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError('Invalid email', API_STATUS.BAD_REQUEST);
    }
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0 && existing[0].id !== id) {
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
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        company: users.company,
        avatarUrl: users.avatarUrl,
        locale: users.locale,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!u) return apiError('User not found', API_STATUS.NOT_FOUND);
    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name ?? undefined,
        company: u.company ?? undefined,
        avatar_url: u.avatarUrl ?? undefined,
        locale: u.locale ?? undefined,
        createdAt: u.createdAt.toISOString(),
      },
    });
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      company: users.company,
      avatarUrl: users.avatarUrl,
      locale: users.locale,
      createdAt: users.createdAt,
    });
  if (!updated) return apiError('User not found', API_STATUS.NOT_FOUND);
  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name ?? undefined,
      company: updated.company ?? undefined,
      avatar_url: updated.avatarUrl ?? undefined,
      locale: updated.locale ?? undefined,
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminApiRequest(_request)) {
    return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  }
  const { id } = await params;
  if (!id) return apiError('User ID required', API_STATUS.BAD_REQUEST);
  const db = getDb();
  const deleted = await db.delete(users).where(eq(users.id, id));
  if ((deleted.rowCount ?? 0) === 0) {
    return apiError('User not found', API_STATUS.NOT_FOUND);
  }
  return NextResponse.json({ success: true });
}
