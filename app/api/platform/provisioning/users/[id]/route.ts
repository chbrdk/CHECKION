import { and, eq, ne } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getDb } from '@/lib/db';
import { apiTokens, users } from '@/lib/db/schema';
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/plexon-contract';
import { getPlexonDerivedPassword } from '@/lib/plexon-auth';

const provisioningBodySchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  desiredState: z.enum(['granted', 'disabled']),
  platformRole: z.enum(['member', 'manager', 'admin']),
  defaultContext: z
    .object({
      entryPointId: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      deepLink: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  contractVersion: z.string().min(1),
  source: z.string().min(1),
  requestedAt: z.string().min(1),
});

function isProvisioningAuthorized(request: Request): boolean {
  const expectedSecret = process.env.PLEXON_SERVICE_SECRET?.trim();
  const requestSecret = request.headers.get(PLEXON_SERVICE_SECRET_HEADER)?.trim();
  const contractVersion = request.headers.get(PLEXON_CONTRACT_VERSION_HEADER)?.trim();
  return Boolean(
    expectedSecret &&
      requestSecret &&
      requestSecret === expectedSecret &&
      contractVersion === PLEXON_FEDERATION_CONTRACT_VERSION
  );
}

function normalizeOptionalString(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isProvisioningAuthorized(request)) {
    return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  }

  const { id } = await params;
  let body: z.infer<typeof provisioningBodySchema>;
  try {
    body = provisioningBodySchema.parse(await request.json());
  } catch {
    return apiError('Invalid provisioning payload', API_STATUS.BAD_REQUEST);
  }

  if (id !== body.userId) {
    return apiError('Path user id does not match payload userId', API_STATUS.BAD_REQUEST);
  }

  const db = getDb();
  const normalizedEmail = body.email.trim().toLowerCase();
  const [emailOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, normalizedEmail), ne(users.id, id)))
    .limit(1);
  if (emailOwner) {
    return apiError('Email already belongs to another local user', API_STATUS.CONFLICT);
  }

  const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (body.desiredState === 'disabled') {
    if (existingUser) {
      await db.delete(apiTokens).where(eq(apiTokens.userId, id));
    }
    return NextResponse.json({
      status: 'disabled',
      externalUserRef: existingUser?.id ?? null,
      details: existingUser
        ? 'Local API tokens revoked; direct session disable remains product-local.'
        : 'No local shadow user found to disable.',
    });
  }

  const name = normalizeOptionalString(body.name);
  const company = normalizeOptionalString(body.company);
  const avatarUrl = normalizeOptionalString(body.avatarUrl);
  const locale = normalizeOptionalString(body.locale);
  const now = new Date();

  if (!existingUser) {
    const passwordHash = await bcrypt.hash(getPlexonDerivedPassword(id), 10);
    const [created] = await db
      .insert(users)
      .values({
        id,
        email: normalizedEmail,
        passwordHash,
        name: name ?? null,
        company: company ?? null,
        avatarUrl: avatarUrl ?? null,
        locale: locale ?? null,
        createdAt: now,
      })
      .returning({ id: users.id });
    return NextResponse.json({
      status: 'applied',
      externalUserRef: created.id,
      details: 'Local shadow user created.',
    });
  }

  const updates: Record<string, string | null> = {};
  if (existingUser.email !== normalizedEmail) updates.email = normalizedEmail;
  if ((existingUser.name ?? null) !== (name ?? null)) updates.name = name ?? null;
  if ((existingUser.company ?? null) !== (company ?? null)) updates.company = company ?? null;
  if ((existingUser.avatarUrl ?? null) !== (avatarUrl ?? null)) updates.avatarUrl = avatarUrl ?? null;
  if ((existingUser.locale ?? null) !== (locale ?? null)) updates.locale = locale ?? null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({
      status: 'no_change',
      externalUserRef: existingUser.id,
      details: 'Local shadow user already matches the requested profile.',
    });
  }

  await db.update(users).set(updates).where(eq(users.id, id));
  return NextResponse.json({
    status: 'applied',
    externalUserRef: existingUser.id,
    details: 'Local shadow user updated.',
  });
}
