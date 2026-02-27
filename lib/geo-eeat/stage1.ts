/**
 * GEO / E-E-A-T Stufe 1: Build GeoEeatIntensiveResult from a single ScanResult.
 * Used after runScan() to populate pages[] with technical data (generative, eeatSignals, etc.).
 */

import type { ScanResult, GeoEeatIntensiveResult, GeoEeatPageResult } from '@/lib/types';

export function buildGeoEeatResultFromScan(scan: ScanResult): GeoEeatIntensiveResult {
    const page: GeoEeatPageResult = {
        url: scan.url,
        title: scan.seo?.title ?? undefined,
        bodyTextExcerpt: scan.bodyTextExcerpt,
        technical: {
            generative: scan.generative,
            eeatSignals: scan.eeatSignals,
            hasPrivacy: scan.privacy?.hasPrivacyPolicy ?? false,
            hasImpressum: scan.eeatSignals?.hasImpressum ?? false,
        },
    };
    return {
        pages: [page],
        recommendations: [],
    };
}
