/**
 * CHECKION – Report usage events to PLEXON (tokens as currency).
 * Fire-and-forget; errors are logged only, no impact on response.
 */

const PLEXON_AUTH_URL = process.env.PLEXON_AUTH_URL ?? '';
const PLEXON_SERVICE_SECRET = process.env.PLEXON_SERVICE_SECRET ?? '';

export type UsageReportParams = {
  userId: string;
  eventType: string;
  rawUnits: Record<string, unknown>;
  idempotencyKey?: string;
};

export function isUsageReportingConfigured(): boolean {
  return Boolean(PLEXON_AUTH_URL.trim() && PLEXON_SERVICE_SECRET.trim());
}

/**
 * Report a usage event to PLEXON. Non-blocking; never throws. Failures are logged only.
 */
export function reportUsage(params: UsageReportParams): void {
  try {
    if (!PLEXON_AUTH_URL.trim() || !PLEXON_SERVICE_SECRET.trim()) return;
    if (!params?.userId || !params?.eventType) return;

    const url = `${PLEXON_AUTH_URL.replace(/\/$/, '')}/api/services/usage/events`;
    const body = {
      user_id: params.userId,
      service: 'checkion' as const,
      event_type: params.eventType,
      raw_units: params.rawUnits ?? {},
      ...(params.idempotencyKey && { idempotency_key: params.idempotencyKey }),
    };

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Secret': PLEXON_SERVICE_SECRET,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    }).catch((e) => {
      console.warn('[CHECKION] usage report failed:', e?.message ?? e);
    });
  } catch (e) {
    console.warn('[CHECKION] usage report setup failed:', e instanceof Error ? e.message : e);
  }
}
