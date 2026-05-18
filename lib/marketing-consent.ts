import { randomUUID } from 'crypto';
import type { getDb } from '@/lib/db';
import { userMarketingConsents } from '@/lib/db/schema';

export async function recordMarketingConsent(
  db: ReturnType<typeof getDb>,
  params: {
    userId: string;
    email: string;
    name: string;
    company: string;
    source?: string;
  }
): Promise<void> {
  await db.insert(userMarketingConsents).values({
    id: randomUUID(),
    userId: params.userId,
    email: params.email,
    name: params.name,
    company: params.company,
    source: params.source ?? 'amc',
  });
}
