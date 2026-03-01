/**
 * Unit tests for GEO/E-E-A-T competitive runs (types and exports).
 * Run: npx tsx lib/db/geo-eeat-competitive-runs.test.ts
 */
import assert from 'node:assert';
import type { CompetitiveRunRow, CompetitiveRunStatus } from './geo-eeat-competitive-runs';
import {
    insertCompetitiveRun,
    getCompetitiveRun,
    listCompetitiveRunsByGeoEeatJob,
    updateCompetitiveRun,
} from './geo-eeat-competitive-runs';

const VALID_STATUSES: CompetitiveRunStatus[] = ['running', 'complete', 'error'];

function run(): void {
    assert.strictEqual(VALID_STATUSES.length, 3);
    assert.ok(VALID_STATUSES.includes('running'));
    assert.ok(VALID_STATUSES.includes('complete'));
    assert.ok(VALID_STATUSES.includes('error'));

    const row: CompetitiveRunRow = {
        id: 'cr-1',
        geoEeatRunId: 'job-1',
        userId: 'user-1',
        startedAt: new Date(),
        completedAt: null,
        status: 'running',
        competitiveByModel: null,
        queries: ['q1'],
        competitors: ['c1'],
        error: null,
    };
    assert.strictEqual(row.status, 'running');
    assert.strictEqual(row.queries.length, 1);
    assert.strictEqual(row.competitors.length, 1);

    assert.strictEqual(typeof insertCompetitiveRun, 'function');
    assert.strictEqual(typeof getCompetitiveRun, 'function');
    assert.strictEqual(typeof listCompetitiveRunsByGeoEeatJob, 'function');
    assert.strictEqual(typeof updateCompetitiveRun, 'function');

    console.log('geo-eeat-competitive-runs.test.ts: all assertions passed');
}

run();
