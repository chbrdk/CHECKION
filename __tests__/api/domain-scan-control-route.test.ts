import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
    getRequestUser: vi.fn(),
}));
vi.mock('@/lib/db/scans', () => ({
    getDomainScan: vi.fn(),
    updateDomainScan: vi.fn(),
}));
vi.mock('@/lib/cache', () => ({
    invalidateDomainScan: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { getDomainScan, updateDomainScan } from '@/lib/db/scans';
import { POST } from '@/app/api/scan/domain/[id]/control/route';

describe('POST /api/scan/domain/[id]/control', () => {
    beforeEach(() => {
        vi.mocked(getRequestUser).mockReset();
        vi.mocked(getDomainScan).mockReset();
        vi.mocked(updateDomainScan).mockReset();
    });

    it('returns 401 when unauthenticated', async () => {
        vi.mocked(getRequestUser).mockResolvedValue(null);
        const res = await POST(
            new Request('http://localhost/api/scan/domain/x/control', {
                method: 'POST',
                body: JSON.stringify({ action: 'pause' }),
            }) as any,
            { params: Promise.resolve({ id: 'x' }) }
        );
        expect(res.status).toBe(401);
    });

    it('returns 404 when scan missing', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getDomainScan).mockResolvedValue(null);
        const res = await POST(
            new Request('http://localhost/api/scan/domain/missing/control', {
                method: 'POST',
                body: JSON.stringify({ action: 'pause' }),
            }) as any,
            { params: Promise.resolve({ id: 'missing' }) }
        );
        expect(res.status).toBe(404);
    });

    it('returns 400 for invalid JSON body', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getDomainScan).mockResolvedValue({
            id: 'd1',
            status: 'scanning',
            progress: { scanned: 1, total: 10 },
        } as any);
        const res = await POST(
            new Request('http://localhost/api/scan/domain/d1/control', {
                method: 'POST',
                body: 'not-json',
            }) as any,
            { params: Promise.resolve({ id: 'd1' }) }
        );
        expect(res.status).toBe(400);
    });

    it('pauses when scanning', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getDomainScan).mockResolvedValue({
            id: 'd1',
            status: 'scanning',
            progress: { scanned: 1, total: 10 },
        } as any);
        vi.mocked(updateDomainScan).mockResolvedValue(true);
        const res = await POST(
            new Request('http://localhost/api/scan/domain/d1/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pause' }),
            }) as any,
            { params: Promise.resolve({ id: 'd1' }) }
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.status).toBe('paused');
        expect(updateDomainScan).toHaveBeenCalledWith('d1', 'u1', { status: 'paused' });
    });

    it('resumes when paused', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getDomainScan).mockResolvedValue({
            id: 'd1',
            status: 'paused',
            progress: { scanned: 1, total: 10 },
        } as any);
        const res = await POST(
            new Request('http://localhost/api/scan/domain/d1/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resume' }),
            }) as any,
            { params: Promise.resolve({ id: 'd1' }) }
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('scanning');
    });

    it('sets cancelling when cancel requested', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getDomainScan).mockResolvedValue({
            id: 'd1',
            status: 'scanning',
            progress: { scanned: 1, total: 10 },
        } as any);
        const res = await POST(
            new Request('http://localhost/api/scan/domain/d1/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel' }),
            }) as any,
            { params: Promise.resolve({ id: 'd1' }) }
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('cancelling');
        expect(updateDomainScan).toHaveBeenCalledWith('d1', 'u1', { status: 'cancelling' });
    });

    it('finalizes stuck cancelling → cancelled on second cancel', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getDomainScan).mockResolvedValue({
            id: 'd1',
            status: 'cancelling',
            progress: { scanned: 3, total: 100 },
        } as any);
        vi.mocked(updateDomainScan).mockResolvedValue(true);
        const res = await POST(
            new Request('http://localhost/api/scan/domain/d1/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel' }),
            }) as any,
            { params: Promise.resolve({ id: 'd1' }) }
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('cancelled');
        expect(updateDomainScan).toHaveBeenCalledWith('d1', 'u1', {
            status: 'cancelled',
            error: 'Cancelled by user',
        });
    });

    it('returns 400 when cancelling a completed scan', async () => {
        vi.mocked(getRequestUser).mockResolvedValue({ id: 'u1' } as any);
        vi.mocked(getDomainScan).mockResolvedValue({
            id: 'd1',
            status: 'complete',
            progress: { scanned: 10, total: 10 },
        } as any);
        const res = await POST(
            new Request('http://localhost/api/scan/domain/d1/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel' }),
            }) as any,
            { params: Promise.resolve({ id: 'd1' }) }
        );
        expect(res.status).toBe(400);
    });
});
