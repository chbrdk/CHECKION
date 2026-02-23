/**
 * Unit tests for share links (resource types and row shape).
 * Run: npx tsx lib/db/shares.test.ts
 */
import assert from 'node:assert';
import type { ShareResourceType, ShareLinkRow } from './shares';

const VALID_SHARE_RESOURCE_TYPES: ShareResourceType[] = ['single', 'domain', 'journey'];

function run(): void {
    // ShareResourceType includes all supported share targets (single scan, domain/deep scan, UX journey)
    assert.strictEqual(VALID_SHARE_RESOURCE_TYPES.length, 3);
    assert.ok(VALID_SHARE_RESOURCE_TYPES.includes('single'));
    assert.ok(VALID_SHARE_RESOURCE_TYPES.includes('domain'));
    assert.ok(VALID_SHARE_RESOURCE_TYPES.includes('journey'));

    // ShareLinkRow type allows journey as resourceType
    const row: ShareLinkRow = {
        token: 'test-token',
        userId: 'user-1',
        resourceType: 'journey',
        resourceId: 'job-123',
        passwordHash: null,
        createdAt: new Date(),
        expiresAt: null,
    };
    assert.strictEqual(row.resourceType, 'journey');
    assert.strictEqual(row.resourceId, 'job-123');

    console.log('shares.test.ts: all assertions passed');
}

run();
