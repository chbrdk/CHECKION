/**
 * Unit tests for GEO/E-E-A-T runs (types and exports).
 * Run: npx tsx lib/db/geo-eeat-runs.test.ts
 */
import assert from 'node:assert';
import type { GeoEeatRunRow, GeoEeatRunStatus } from './geo-eeat-runs';
import {
    insertGeoEeatRun,
    getGeoEeatRun,
    updateGeoEeatRun,
    listGeoEeatRuns,
} from './geo-eeat-runs';

const VALID_STATUSES: GeoEeatRunStatus[] = ['queued', 'running', 'complete', 'error'];

function run(): void {
    assert.strictEqual(VALID_STATUSES.length, 4);
    assert.ok(VALID_STATUSES.includes('queued'));
    assert.ok(VALID_STATUSES.includes('running'));
    assert.ok(VALID_STATUSES.includes('complete'));
    assert.ok(VALID_STATUSES.includes('error'));

    const row: GeoEeatRunRow = {
        id: 'run-1',
        userId: 'user-1',
        projectId: null,
        url: 'https://example.com',
        domainScanId: null,
        status: 'complete',
        payload: { pages: [], recommendations: [] },
        error: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    assert.strictEqual(row.status, 'complete');
    assert.ok(row.payload);
    assert.deepStrictEqual(row.payload.pages, []);

    assert.strictEqual(typeof insertGeoEeatRun, 'function');
    assert.strictEqual(typeof getGeoEeatRun, 'function');
    assert.strictEqual(typeof updateGeoEeatRun, 'function');
    assert.strictEqual(typeof listGeoEeatRuns, 'function');

    console.log('geo-eeat-runs.test.ts: all assertions passed');
}

run();
