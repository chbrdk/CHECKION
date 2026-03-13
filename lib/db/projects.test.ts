/**
 * Unit tests for projects DB (types and exports).
 * Run: npx tsx lib/db/projects.test.ts
 */
import assert from 'node:assert';
import type { ProjectRow } from './projects';
import {
    insertProject,
    getProject,
    listProjects,
    updateProject,
    deleteProject,
} from './projects';

function run(): void {
    const row: ProjectRow = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
        domain: 'https://example.com',
        competitors: [],
        geoQueries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    assert.strictEqual(row.name, 'Test Project');
    assert.strictEqual(row.domain, 'https://example.com');

    assert.strictEqual(typeof insertProject, 'function');
    assert.strictEqual(typeof getProject, 'function');
    assert.strictEqual(typeof listProjects, 'function');
    assert.strictEqual(typeof updateProject, 'function');
    assert.strictEqual(typeof deleteProject, 'function');

    console.log('projects.test.ts: all assertions passed');
}

run();
