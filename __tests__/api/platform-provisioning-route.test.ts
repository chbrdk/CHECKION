import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/db/project-members', () => ({
  replacePlatformManagedProjectMemberships: vi.fn(),
}));

vi.mock('@/lib/plexon-auth', () => ({
  getPlexonDerivedPassword: vi.fn(() => 'derived-password'),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => 'hashed-password'),
  },
}));

import { getDb } from '@/lib/db';
import { replacePlatformManagedProjectMemberships } from '@/lib/db/project-members';

function mockDb({
  emailOwner = [],
  existingUsers = [],
  existingProjects = [],
  insertedId = 'user-1',
}: {
  emailOwner?: Array<{ id: string }>;
  existingUsers?: Array<Record<string, unknown>>;
  existingProjects?: Array<{ id: string }>;
  insertedId?: string;
}) {
  let selectCall = 0;
  const select = vi.fn(() => ({
    from: () => ({
      where: () => ({
        limit: async () => {
          selectCall += 1;
          if (selectCall === 1) return emailOwner;
          if (selectCall === 2) return existingUsers;
          return existingProjects;
        },
      }),
    }),
  }));

  const deleteWhere = vi.fn(async () => ({ rowCount: 1 }));
  const insertReturning = vi.fn(async () => [{ id: insertedId }]);
  const updateWhere = vi.fn(async () => ({ rowCount: 1 }));

  vi.mocked(getDb).mockReturnValue({
    select,
    delete: vi.fn(() => ({
      where: deleteWhere,
    })),
    insert: vi.fn(() => ({
      values: () => ({
        returning: insertReturning,
      }),
    })),
    update: vi.fn(() => ({
      set: () => ({
        where: updateWhere,
      }),
    })),
  } as never);

  return { deleteWhere, insertReturning, updateWhere };
}

describe('PUT /api/platform/provisioning/users/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.PLEXON_SERVICE_SECRET = 'test-secret';
  });

  it('rejects unauthenticated provisioning requests', async () => {
    const { PUT } = await import('@/app/api/platform/provisioning/users/[id]/route');
    const response = await PUT(
      new Request('http://localhost/api/platform/provisioning/users/user-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'user-1' }) }
    );
    expect(response.status).toBe(401);
  });

  it('creates a local shadow user for granted access', async () => {
    mockDb({});
    const { PUT } = await import('@/app/api/platform/provisioning/users/[id]/route');
    const response = await PUT(
      new Request('http://localhost/api/platform/provisioning/users/user-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': 'test-secret',
          'X-Plexon-Contract-Version': '2026-05-plexon-federation-v3',
        },
        body: JSON.stringify({
          userId: 'user-1',
          email: 'User@example.com',
          name: 'Provisioned User',
          company: 'Acme',
          avatarUrl: 'https://example.com/avatar.png',
          locale: 'de',
          desiredState: 'granted',
          platformRole: 'member',
          defaultContext: null,
          contractVersion: '2026-05-plexon-federation-v3',
          source: 'plexon-admin-sync',
          requestedAt: '2026-05-12T20:00:00.000Z',
        }),
      }),
      { params: Promise.resolve({ id: 'user-1' }) }
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'applied',
      externalUserRef: 'user-1',
    });
  });

  it('returns disabled and revokes local api tokens', async () => {
    const { deleteWhere } = mockDb({
      existingUsers: [
        {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Provisioned User',
          company: 'Acme',
          avatarUrl: null,
          locale: 'de',
        },
      ],
    });

    const { PUT } = await import('@/app/api/platform/provisioning/users/[id]/route');
    const response = await PUT(
      new Request('http://localhost/api/platform/provisioning/users/user-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': 'test-secret',
          'X-Plexon-Contract-Version': '2026-05-plexon-federation-v3',
        },
        body: JSON.stringify({
          userId: 'user-1',
          email: 'user@example.com',
          desiredState: 'disabled',
          platformRole: 'member',
          defaultContext: null,
          contractVersion: '2026-05-plexon-federation-v3',
          source: 'plexon-admin-sync',
          requestedAt: '2026-05-12T20:00:00.000Z',
        }),
      }),
      { params: Promise.resolve({ id: 'user-1' }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'disabled',
      externalUserRef: 'user-1',
    });
    expect(deleteWhere).toHaveBeenCalled();
  });

  it('syncs explicit platform-managed project memberships', async () => {
    mockDb({
      existingProjects: [{ id: 'project-1' }],
    });

    const { PUT } = await import('@/app/api/platform/provisioning/users/[id]/route');
    const response = await PUT(
      new Request('http://localhost/api/platform/provisioning/users/user-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': 'test-secret',
          'X-Plexon-Contract-Version': '2026-05-plexon-federation-v3',
        },
        body: JSON.stringify({
          userId: 'user-1',
          email: 'user@example.com',
          desiredState: 'granted',
          platformRole: 'member',
          defaultContext: null,
          projectAssignments: [{ projectId: 'project-1', role: 'admin' }],
          contractVersion: '2026-05-plexon-federation-v3',
          source: 'plexon-admin-sync',
          requestedAt: '2026-05-12T20:00:00.000Z',
        }),
      }),
      { params: Promise.resolve({ id: 'user-1' }) }
    );

    expect(response.status).toBe(200);
    expect(replacePlatformManagedProjectMemberships).toHaveBeenCalledWith('user-1', [
      { projectId: 'project-1', role: 'admin' },
    ]);
  });
});
