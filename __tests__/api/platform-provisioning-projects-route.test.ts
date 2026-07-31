import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
  getProjectRowByPlatformProjectId: vi.fn(),
  insertProject: vi.fn(),
  getProject: vi.fn(),
}));

vi.mock('@/lib/db/scans', () => ({
  countScansByProjectId: vi.fn(),
  getSharedProjectDomainScansCount: vi.fn(),
  listSharedProjectDomainScanSummaries: vi.fn(),
  listSharedProjectStandaloneScanSummaries: vi.fn(),
}));

import { getDb } from '@/lib/db';
import { getProject, getProjectRowByPlatformProjectId, insertProject } from '@/lib/db/projects';
import {
  countScansByProjectId,
  getSharedProjectDomainScansCount,
  listSharedProjectDomainScanSummaries,
  listSharedProjectStandaloneScanSummaries,
} from '@/lib/db/scans';

describe('platform provisioning projects route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.PLEXON_SERVICE_SECRET = 'test-secret';
  });

  it('PUT rejects without service secret', async () => {
    const { PUT } = await import('@/app/api/platform/provisioning/projects/[id]/route');
    const res = await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/p1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'p1' }) }
    );
    expect(res.status).toBe(401);
  });

  it('PUT creates mirror when platform id is new', async () => {
    vi.mocked(getProjectRowByPlatformProjectId).mockResolvedValue(null);
    vi.mocked(insertProject).mockResolvedValue(undefined);
    const updateWhere = vi.fn(async () => ({ rowCount: 1 }));
    vi.mocked(getDb).mockReturnValue({
      update: vi.fn(() => ({
        set: () => ({ where: updateWhere }),
      })),
    } as never);

    const { PUT } = await import('@/app/api/platform/provisioning/projects/[id]/route');
    const res = await PUT(
      new Request('http://localhost/api/platform/provisioning/projects/platform-pp-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': 'test-secret',
          'X-Plexon-Contract-Version': '2026-05-plexon-federation-v3',
        },
        body: JSON.stringify({
          platformCompanyId: 'c1',
          name: 'Mirror',
          domain: 'mirror.test',
          status: 'active',
          ownerUserId: 'plexon-owner-1',
          contractVersion: '2026-05-plexon-federation-v3',
          source: 'test',
          requestedAt: new Date().toISOString(),
        }),
      }),
      { params: Promise.resolve({ id: 'platform-pp-1' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('applied');
    expect(typeof body.externalProjectId).toBe('string');
    expect(insertProject).toHaveBeenCalled();
  });

  it('GET returns scan catalog for authorized plexon user', async () => {
    vi.mocked(getProjectRowByPlatformProjectId).mockResolvedValue({
      id: 'local-1',
      userId: 'plexon-owner-1',
      name: 'X',
      domain: null,
      industry: null,
      valueProposition: null,
      competitors: [],
      geoQueries: [],
      tags: [],
      platformProjectId: 'platform-pp-1',
      platformCompanyId: 'c1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(getProject).mockResolvedValue({ id: 'local-1' } as never);
    vi.mocked(countScansByProjectId).mockResolvedValue(2);
    vi.mocked(getSharedProjectDomainScansCount).mockResolvedValue(1);
    vi.mocked(listSharedProjectDomainScanSummaries).mockResolvedValue([
      {
        id: 'dom-1',
        domain: 'example.com',
        timestamp: '2026-07-01T00:00:00.000Z',
        status: 'complete',
        score: 88,
        totalPages: 12,
        lineageVersion: 1,
        projectId: 'local-1',
        userId: 'u1',
        industry: null,
        projectTags: [],
        tags: [],
      },
    ] as never);
    vi.mocked(listSharedProjectStandaloneScanSummaries).mockResolvedValue([
      {
        id: 'scan-1',
        url: 'https://example.com/a',
        timestamp: '2026-07-01T00:00:00.000Z',
        score: 70,
        stats: { errors: 0, warnings: 0, notices: 0 },
        projectId: 'local-1',
        groupId: null,
        scanSessionId: null,
        device: 'desktop',
        tags: [],
        projectTags: [],
        industry: null,
      },
    ] as never);

    const { GET } = await import('@/app/api/platform/provisioning/projects/[id]/route');
    const res = await GET(
      new Request('http://localhost/api/platform/provisioning/projects/platform-pp-1', {
        headers: {
          'X-Service-Secret': 'test-secret',
          'X-Plexon-Contract-Version': '2026-05-plexon-federation-v3',
          'X-Plexon-User-Id': 'plexon-owner-1',
        },
      }),
      { params: Promise.resolve({ id: 'platform-pp-1' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.externalProjectId).toBe('local-1');
    expect(body.standaloneScanCount).toBe(2);
    expect(body.domainScanCount).toBe(1);
    expect(body.scanCount).toBe(3);
    expect(body.domainScans).toEqual([
      {
        id: 'dom-1',
        domain: 'example.com',
        status: 'complete',
        score: 88,
        timestamp: '2026-07-01T00:00:00.000Z',
        totalPages: 12,
      },
    ]);
    expect(body.standaloneScans).toEqual([
      {
        id: 'scan-1',
        url: 'https://example.com/a',
        score: 70,
        timestamp: '2026-07-01T00:00:00.000Z',
      },
    ]);
  });
});
