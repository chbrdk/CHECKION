import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..');

function lockVersion(pkgPath: string): string {
    const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8')) as {
        packages: Record<string, { version?: string }>;
    };
    const entry = lock.packages[pkgPath];
    if (!entry?.version) {
        throw new Error(`Missing lock entry: ${pkgPath}`);
    }
    return entry.version;
}

describe('a11y engine versions', () => {
    it('uses current axe-core and pa11y majors', () => {
        expect(lockVersion('node_modules/axe-core')).toMatch(/^4\.12\./);
        expect(lockVersion('node_modules/pa11y')).toMatch(/^9\.1\./);
        expect(lockVersion('node_modules/@pa11y/html_codesniffer')).toBe('2.6.0');
        expect(lockVersion('node_modules/pa11y/node_modules/axe-core')).toMatch(/^4\.11\./);
    });
});
