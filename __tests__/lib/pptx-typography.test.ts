import { describe, expect, it } from 'vitest';
import { buildComprehensivePreviewBundle } from '@/lib/paths/pdf-print-preview-bundle';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { buildPersonaChartBullets } from '@/lib/project-report/pptx/build-pptx-audience';
import {
    bulletTypographyRole,
    isMonoBulletLine,
    PPTX_TYPOGRAPHY,
} from '@/lib/project-report/pptx/pptx-typography';
import { getZoneTypography } from '@/lib/project-report/pptx/pptx-text-layout';

describe('pptx-typography', () => {
    it('uses smaller body and mono eyebrow sizes', () => {
        expect(PPTX_TYPOGRAPHY.body.fontPt).toBeLessThan(14);
        expect(PPTX_TYPOGRAPHY.eyebrow.fontFace).toContain('IBM Plex Mono');
        expect(PPTX_TYPOGRAPHY.chartBullet.fontFace).toContain('IBM Plex Mono');
    });

    it('detects metadata bullets for mono styling', () => {
        expect(isMonoBulletLine('AUDION: Demo Project')).toBe(true);
        expect(isMonoBulletLine('WCAG: Kontrastproblem im Hero')).toBe(true);
        expect(bulletTypographyRole('AUDION: Demo')).toBe('bodyMono');
        expect(bulletTypographyRole('Narrative insight about the persona')).toBe('body');
    });

    it('fits more characters per line with smaller fonts', () => {
        const body = getZoneTypography('body');
        expect(body.charsPerLine).toBeGreaterThan(91);
        expect(body.maxLines).toBeGreaterThan(20);
    });

    it('keeps full persona insight text in chart bullets', () => {
        const persona = buildComprehensivePreviewBundle().audience!.personas[0]!;
        const labels = getProjectReportPdfLabels('de');
        const bullets = buildPersonaChartBullets(persona, labels);
        expect(bullets.length).toBeGreaterThan(0);
        expect(bullets.every((line) => !line.endsWith('…'))).toBe(true);
        if (persona.personaPerspective?.trim()) {
            expect(bullets.some((line) => line.includes(persona.personaPerspective!.trim().slice(0, 20)))).toBe(
                true
            );
        }
    });
});
