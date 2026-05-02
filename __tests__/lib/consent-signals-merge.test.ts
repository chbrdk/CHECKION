import { describe, expect, it } from 'vitest';
import { buildConsentSignals, extractConsentModeHintsFromInline } from '@/lib/consent-signals-merge';

describe('extractConsentModeHintsFromInline', () => {
    it('detects consent mode markers', () => {
        const s = 'gtag("consent","default",{ads_data_redaction:true,url_passthrough:true,wait_for_update:500});';
        const hints = extractConsentModeHintsFromInline(s);
        expect(hints).toContain('ads_data_redaction');
        expect(hints).toContain('url_passthrough');
        expect(hints).toContain('wait_for_update');
        expect(hints).toContain('consent_default_or_update');
    });

    it('returns empty for unrelated script', () => {
        expect(extractConsentModeHintsFromInline('console.log(1)')).toEqual([]);
    });
});

describe('buildConsentSignals', () => {
    it('returns undefined when no signals', () => {
        expect(
            buildConsentSignals(
                {
                    tcfApiPresent: false,
                    cmpDomHints: [],
                    dataLayerPreview: [],
                    inlineGtmOrGtagDetected: false,
                },
                [],
                []
            )
        ).toBeUndefined();
    });

    it('merges probe, hints, and early hosts', () => {
        const out = buildConsentSignals(
            {
                tcfApiPresent: true,
                cmpDomHints: ['#cookiebot'],
                dataLayerPreview: ['event: cmp'],
                inlineGtmOrGtagDetected: true,
            },
            ['ads_data_redaction'],
            ['googletagmanager.com', 'x.com']
        );
        expect(out?.tcfApiPresent).toBe(true);
        expect(out?.cmpDomHints).toContain('#cookiebot');
        expect(out?.consentModeHints).toContain('ads_data_redaction');
        expect(out?.earlyThirdPartyScriptHosts).toEqual(['googletagmanager.com', 'x.com']);
    });
});
