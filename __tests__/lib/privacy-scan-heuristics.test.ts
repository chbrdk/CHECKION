import { describe, it, expect } from 'vitest';
import { buildPrivacyAudit } from '@/lib/privacy-scan-heuristics';

describe('buildPrivacyAudit', () => {
    it('detects Datenschutz link text', () => {
        const p = buildPrivacyAudit(
            [{ text: 'Datenschutz', href: '/datenschutz' }],
            'https://example.com/page',
            false
        );
        expect(p.hasPrivacyPolicy).toBe(true);
        expect(p.privacyPolicyUrl).toBe('https://example.com/datenschutz');
        expect(p.hasTermsOfService).toBe(false);
    });

    it('detects privacy policy via href path without keyword in text', () => {
        const p = buildPrivacyAudit(
            [{ text: 'Mehr erfahren', href: '/de/privacy-policy' }],
            'https://example.com/',
            false
        );
        expect(p.hasPrivacyPolicy).toBe(true);
        expect(p.hasTermsOfService).toBe(false);
    });

    it('does not treat Impressum-only link as privacy policy', () => {
        const p = buildPrivacyAudit(
            [{ text: 'Impressum', href: '/impressum' }],
            'https://example.com/',
            false
        );
        expect(p.hasPrivacyPolicy).toBe(false);
    });

    it('detects AGB separately from Datenschutz', () => {
        const p = buildPrivacyAudit(
            [
                { text: 'AGB', href: '/agb' },
                { text: 'Datenschutz', href: '/privacy' },
            ],
            'https://shop.example/',
            false
        );
        expect(p.hasPrivacyPolicy).toBe(true);
        expect(p.hasTermsOfService).toBe(true);
    });

    it('passes through cookie banner hint', () => {
        const p = buildPrivacyAudit([{ text: 'Home', href: '/' }], 'https://example.com/', true);
        expect(p.hasCookieBanner).toBe(true);
    });
});
