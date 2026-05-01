/**
 * API tests: POST /api/scans/domain/compare
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth-api-token', () => ({ getRequestUser: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => ({ allowed: true, remaining: 999 }) }));
vi.mock('@/lib/db/scans', () => ({ getDomainScan: vi.fn() }));

import { POST } from '@/app/api/scans/domain/compare/route';
import { getRequestUser } from '@/lib/auth-api-token';
import { getDomainScan } from '@/lib/db/scans';
import type { DomainScanResult } from '@/lib/types';

const idA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const idB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function minimalScan(id: string, domain: string): DomainScanResult {
    return {
        id,
        domain,
        timestamp: '2026-01-01T00:00:00.000Z',
        status: 'complete',
        progress: { scanned: 1, total: 1 },
        totalPages: 3,
        score: 80,
        pages: [],
        graph: { nodes: [], links: [] },
        systemicIssues: [],
        aggregated: {
            issues: {
                stats: { errors: 1, warnings: 2, notices: 0, total: 3 },
            },
            pageClassification: {
                topThemes: [{ tag: 'T1', score: 5, pageCount: 2, maxTier: 5, avgTier: 4 }],
            },
        } as unknown as DomainScanResult['aggregated'],
    };
}

describe('POST /api/scans/domain/compare', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getDomainScan).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const req = new NextRequest('http://localhost/api/scans/domain/compare', {
            method: 'POST',
            body: JSON.stringify({ ids: [idA, idB] }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns 400 when not exactly two ids', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        const req = new NextRequest('http://localhost/api/scans/domain/compare', {
            method: 'POST',
            body: JSON.stringify({ ids: [idA] }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('returns 404 when a scan is missing', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getDomainScan).mockImplementation(async (scanId: string) => {
            if (scanId === idA) return minimalScan(idA, 'https://a.com');
            return null;
        });
        const req = new NextRequest('http://localhost/api/scans/domain/compare', {
            method: 'POST',
            body: JSON.stringify({ ids: [idA, idB] }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res = await POST(req);
        expect(res.status).toBe(404);
    });

    it('returns 200 with two compare DTOs', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'user-1' } as never);
        vi.mocked(getDomainScan).mockImplementation(async (scanId: string) => {
            if (scanId === idA) return minimalScan(idA, 'https://a.com');
            if (scanId === idB) return minimalScan(idB, 'https://b.com');
            return null;
        });
        const req = new NextRequest('http://localhost/api/scans/domain/compare', {
            method: 'POST',
            body: JSON.stringify({ ids: [idA, idB] }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.data.scans).toHaveLength(2);
        expect(data.data.scans[0].id).toBe(idA);
        expect(data.data.scans[0].domain).toBe('https://a.com');
        expect(data.data.scans[0].issueStats).toEqual({ errors: 1, warnings: 2, notices: 0, total: 3 });
        expect(data.data.scans[0].topThemes[0].tag).toBe('T1');
        expect(data.data.scans[1].id).toBe(idB);
    });
});
