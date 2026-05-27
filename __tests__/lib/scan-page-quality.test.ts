import { describe, expect, it } from 'vitest';
import {
    buildScanPageQualityProbe,
    detectScanPageQuality,
    probeMatchesPlaceholder,
} from '@/lib/scan-page-quality';

describe('scan-page-quality', () => {
    it('detects exyte-style maintenance placeholder', () => {
        const probe = buildScanPageQualityProbe({
            title: 'Maintenance',
            bodyText: 'This Site Is Under Maintenance',
            linkCount: 0,
        });
        expect(probeMatchesPlaceholder(probe)).toBe(true);
        const issues = detectScanPageQuality(probe);
        expect(issues.some((i) => i.code === 'placeholder_page')).toBe(true);
    });

    it('does not flag a normal marketing page', () => {
        const probe = buildScanPageQualityProbe({
            title: 'Engineering solutions for high tech facilities | Exyte',
            bodyText: 'Markets Services About Us We create a better future '.repeat(40),
            linkCount: 200,
        });
        expect(probeMatchesPlaceholder(probe)).toBe(false);
        expect(detectScanPageQuality(probe)).toHaveLength(0);
    });

    it('detects thin content when not a known placeholder phrase', () => {
        const probe = buildScanPageQualityProbe({
            title: 'Welcome',
            bodyText: 'Hello world',
            linkCount: 0,
        });
        const issues = detectScanPageQuality(probe);
        expect(issues.some((i) => i.code === 'thin_content')).toBe(true);
    });
});
