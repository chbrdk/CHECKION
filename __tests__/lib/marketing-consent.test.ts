import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('user_marketing_consents', () => {
  it('is defined in schema and migration 0022', () => {
    const schema = readFileSync(resolve(process.cwd(), 'lib/db/schema.ts'), 'utf8');
    expect(schema).toContain('userMarketingConsents');
    expect(schema).toContain('user_marketing_consents');
    const sql = readFileSync(
      resolve(process.cwd(), 'lib/db/migrations/0022_user_marketing_consents.sql'),
      'utf8'
    );
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS user_marketing_consents');
  });
});
