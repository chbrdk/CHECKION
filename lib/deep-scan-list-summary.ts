/**
 * One-line summaries for deep-scan list/archive from stored `aggregated.infra` (JSONB).
 */
import type { AggregatedInfra } from '@/lib/domain-aggregation';

const PLATFORM_CAP = 4;

export function formatDeepScanInfraListLines(raw: unknown): {
    platformsLine: string | null;
    infraLine: string | null;
    privacyLine: string | null;
} {
    if (raw == null || typeof raw !== 'object') {
        return { platformsLine: null, infraLine: null, privacyLine: null };
    }
    const infra = raw as Partial<AggregatedInfra>;

    const sample = infra.geo?.sample;
    const platforms = Array.isArray(sample?.detectedPlatforms)
        ? sample.detectedPlatforms.filter((x): x is string => typeof x === 'string')
        : [];
    const platformsLine =
        platforms.length > 0
            ? (() => {
                  const shown = platforms.slice(0, PLATFORM_CAP);
                  const suffix = platforms.length > PLATFORM_CAP ? '…' : '';
                  return `${shown.join(', ')}${suffix}`;
              })()
            : null;

    const infraParts: string[] = [];
    const cdn = sample?.cdn;
    if (cdn?.detected && cdn.provider?.trim()) {
        infraParts.push(cdn.provider.trim());
    } else if (cdn?.detected) {
        infraParts.push('CDN');
    }
    const hh = sample?.hostingHints;
    if (hh?.server?.trim()) infraParts.push(hh.server.trim());
    if (hh?.poweredBy?.trim()) infraParts.push(hh.poweredBy.trim());
    const sec = infra.security;
    if (sec && typeof sec.totalPages === 'number' && sec.totalPages > 0 && typeof sec.withCsp === 'number') {
        infraParts.push(`CSP ${sec.withCsp}/${sec.totalPages}`);
    }
    const infraLine = infraParts.length > 0 ? infraParts.join(' · ') : null;

    const priv = infra.privacy;
    let privacyLine: string | null = null;
    if (priv && typeof priv.totalPages === 'number' && priv.totalPages > 0) {
        privacyLine = `${priv.withPolicy}/${priv.totalPages} · ${priv.withCookieBanner}/${priv.totalPages} · ${priv.withTerms}/${priv.totalPages}`;
        const consent = priv.consent;
        if (consent && (consent.pagesWithTcfApi > 0 || consent.pagesWithCmpHint > 0)) {
            const bits: string[] = [];
            if (consent.pagesWithTcfApi > 0) bits.push(`TCF ${consent.pagesWithTcfApi}`);
            if (consent.pagesWithCmpHint > 0) bits.push(`CMP ${consent.pagesWithCmpHint}`);
            if (bits.length > 0) privacyLine = `${privacyLine} · ${bits.join(' · ')}`;
        }
    }

    if (!platformsLine && !infraLine && !privacyLine) {
        return { platformsLine: null, infraLine: null, privacyLine: null };
    }
    return { platformsLine, infraLine, privacyLine };
}
