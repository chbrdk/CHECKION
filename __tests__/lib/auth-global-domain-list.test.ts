import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { canListAllUsersDomainScans } from '@/lib/auth-global-domain-list';

describe('canListAllUsersDomainScans', () => {
    const saved: Record<string, string | undefined> = {};

    beforeEach(() => {
        for (const k of [
            'CHECKION_ADMIN_API_KEY',
            'CHECKION_GLOBAL_DOMAIN_SCAN_ALL_AUTHENTICATED',
            'CHECKION_GLOBAL_DOMAIN_SCAN_USER_IDS',
        ]) {
            saved[k] = process.env[k];
            delete process.env[k];
        }
    });

    afterEach(() => {
        for (const k of Object.keys(saved)) {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        }
    });

    it('returns false without user id', () => {
        expect(canListAllUsersDomainScans(new Request('http://localhost/'), null)).toBe(false);
    });

    it('returns false for session user when no rule matches', () => {
        process.env.CHECKION_ADMIN_API_KEY = '1234567890abcdef';
        expect(canListAllUsersDomainScans(new Request('http://localhost/'), 'u-1')).toBe(false);
    });

    it('returns true when CHECKION_GLOBAL_DOMAIN_SCAN_ALL_AUTHENTICATED is truthy', () => {
        process.env.CHECKION_GLOBAL_DOMAIN_SCAN_ALL_AUTHENTICATED = 'true';
        expect(canListAllUsersDomainScans(new Request('http://localhost/'), 'any-user')).toBe(true);
    });

    it('returns true when user id is in CHECKION_GLOBAL_DOMAIN_SCAN_USER_IDS', () => {
        process.env.CHECKION_GLOBAL_DOMAIN_SCAN_USER_IDS = 'a, b-2 ,c';
        expect(canListAllUsersDomainScans(new Request('http://localhost/'), 'b-2')).toBe(true);
        expect(canListAllUsersDomainScans(new Request('http://localhost/'), 'x')).toBe(false);
    });

    it('returns true for admin bearer when key is configured', () => {
        process.env.CHECKION_ADMIN_API_KEY = '1234567890abcdef';
        const req = new Request('http://localhost/', {
            headers: { Authorization: 'Bearer 1234567890abcdef' },
        });
        expect(canListAllUsersDomainScans(req, null)).toBe(true);
    });
});
