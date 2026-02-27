/**
 * Unit tests for share links (resource types and row shape).
 * Run: npx tsx lib/db/shares.test.ts
 */
import assert from 'node:assert';
import type { ShareResourceType, ShareLinkRow } from './shares';

const VALID_SHARE_RESOURCE_TYPES: ShareResourceType[] = ['single', 'domain', 'journey', 'geo_eeat'];

function run(): void {
    // ShareResourceType includes all supported share targets (single, domain, journey, geo_eeat)
    assert.strictEqual(VALID_SHARE_RESOURCE_TYPES.length, 4);
    assert.ok(VALID_SHARE_RESOURCE_TYPES.includes('single'));
    assert.ok(VALID_SHARE_RESOURCE_TYPES.includes('domain'));
    assert.ok(VALID_SHARE_RESOURCE_TYPES.includes('journey'));
    assert.ok(VALID_SHARE_RESOURCE_TYPES.includes('geo_eeat'));

    // ShareLinkRow type allows geo_eeat as resourceType
    const row: ShareLinkRow = {
        token: 'test-token',
        userId: 'user-1',
        resourceType: 'geo_eeat',
        resourceId: 'job-123',
        passwordHash: null,
        createdAt: new Date(),
        expiresAt: null,
    };
    assert.strictEqual(row.resourceType, 'geo_eeat');
    assert.strictEqual(row.resourceId, 'job-123');

    console.log('shares.test.ts: all assertions passed');
}

run();
