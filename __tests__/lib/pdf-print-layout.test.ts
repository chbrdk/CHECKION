import { describe, it, expect } from 'vitest';
import {
    buildAppInnerFramePath,
    buildCornerTabPath,
    buildMsqdxCornerBoxPath,
    buildRoundedRectPath,
    cornerTabBox,
    pdfCornerTabStyles,
} from '@/components/pdf/shared/pdf-frame-path';
import {
    pdfNeedsSpreadPadBeforeChapter,
    pdfSpreadSideFromIndex,
    pdfFrameRectForSide,
    pdfContentMarginsForSide,
    pdfFrameRadiiForSide,
    PDF_PAGE_WIDTH_PT,
    PDF_BINDING_GUTTER_PT,
    PDF_FRAME_INSET_PT,
    PDF_FRAME_BORDER_PT,
    PDF_CORNER_TAB_PADDING_X_PT,
    PDF_CORNER_TAB_WIDTH_PT,
    PDF_CORNER_TAB_TOTAL_HEIGHT_PT,
    PDF_RADIUS_1_5XL_PT,
    PDF_RADIUS_BUTTON_PT,
    pdfContentMarginsForSide,
    pdfShowsCornerTabForSide,
} from '@/lib/paths/pdf-print-tokens';

describe('pdf-frame-path', () => {
    it('builds closed rounded rect path', () => {
        const d = buildRoundedRectPath(0, 0, 100, 50, {
            topLeft: 8,
            topRight: 8,
            bottomRight: 8,
            bottomLeft: 8,
        });
        expect(d.startsWith('M')).toBe(true);
        expect(d.endsWith('Z')).toBe(true);
    });

    it('builds spread-aware inner frames', () => {
        expect(buildAppInnerFramePath('left')).toContain('M');
        expect(buildAppInnerFramePath('right')).toContain('M');
    });

    it('builds corner tab with concave cutdown arcs (not convex rounded corners)', () => {
        const cover = buildCornerTabPath('cover');
        const styles = pdfCornerTabStyles('left');
        expect(styles.topRight).toBe('cutdown-a');
        expect(styles.bottomLeft).toBe('cutdown-b');
        expect(cover).toContain('A ');
        expect(cover).not.toContain('Q ');
        // cutdown-a at top-right: concave sweep 0
        expect(cover).toMatch(/A [\d.]+ [\d.]+ 0 0 0 [\d.]+ [\d.]+/);
        expect(cover).toMatch(/A [\d.]+ [\d.]+ 0 0 1 [\d.]+ [\d.]+/);

        const right = buildCornerTabPath('right');
        expect(right).toContain('A ');
    });

    it('left anchor uses square top-left and cutdown transitions like MsqdxAppLayout', () => {
        const d = buildMsqdxCornerBoxPath(10, 10, 96, 31, 16, 'left');
        expect(d.startsWith('M 10 10')).toBe(true);
        expect(d).toContain('0 0 0');
        expect(d).toContain('0 0 1');
    });

    it('corner tab width matches logo + padding (fit-content)', () => {
        expect(PDF_CORNER_TAB_WIDTH_PT).toBe(72 + 2 * PDF_CORNER_TAB_PADDING_X_PT);
    });

    it('maps cover radii like CHECKION app shell with sidebar', () => {
        const radii = pdfFrameRadiiForSide('cover');
        expect(radii.topLeft).toBe(0);
        expect(radii.topRight).toBe(PDF_RADIUS_1_5XL_PT);
        expect(radii.bottomLeft).toBe(PDF_RADIUS_BUTTON_PT);
    });
});

describe('pdf-print-tokens spread helpers', () => {
    it('maps cover and spread sides', () => {
        expect(pdfSpreadSideFromIndex(0)).toBe('cover');
        expect(pdfSpreadSideFromIndex(1)).toBe('left');
        expect(pdfSpreadSideFromIndex(2)).toBe('right');
    });

    it('pads chapter when next page would be odd', () => {
        expect(pdfNeedsSpreadPadBeforeChapter(1)).toBe(false);
        expect(pdfNeedsSpreadPadBeforeChapter(4)).toBe(true);
    });

    it('left page frame extends to binding edge (no right inset)', () => {
        const rect = pdfFrameRectForSide('left');
        expect(rect.x).toBe(PDF_FRAME_INSET_PT);
        expect(rect.x + rect.width).toBeCloseTo(PDF_PAGE_WIDTH_PT - PDF_BINDING_GUTTER_PT, 0);
    });

    it('right page frame extends to outer page edge (no right inset)', () => {
        const rect = pdfFrameRectForSide('right');
        expect(rect.x).toBe(PDF_BINDING_GUTTER_PT);
        expect(rect.x + rect.width).toBeCloseTo(PDF_PAGE_WIDTH_PT, 0);
    });

    it('right page content has no outer margin on the right', () => {
        const m = pdfContentMarginsForSide('left');
        const right = pdfContentMarginsForSide('right');
        expect(right.paddingRight).toBeLessThan(m.paddingLeft);
        expect(m.paddingLeft).toBeGreaterThan(right.paddingLeft);
    });

    it('uses layer inset with MsqdxAppLayout thin border width', () => {
        expect(PDF_FRAME_BORDER_PT).toBe(3);
        expect(PDF_FRAME_INSET_PT).toBe(10);
    });

    it('positions corner tab flush with frame inset (no border offset)', () => {
        const tab = cornerTabBox('cover');
        const rect = pdfFrameRectForSide('cover');
        expect(tab.x).toBe(rect.x);
        expect(tab.y).toBe(rect.y);
    });

    it('uses browser-tuned horizontal padding on the logo corner tab', () => {
        expect(PDF_CORNER_TAB_PADDING_X_PT).toBe(12);
    });

    it('shows top-left corner tab only on cover and left spread pages', () => {
        expect(pdfShowsCornerTabForSide('cover')).toBe(true);
        expect(pdfShowsCornerTabForSide('left')).toBe(true);
        expect(pdfShowsCornerTabForSide('right')).toBe(false);
    });

    it('reserves corner-tab height in top margin only when the tab is visible', () => {
        const left = pdfContentMarginsForSide('left');
        const right = pdfContentMarginsForSide('right');
        expect(left.paddingTop - right.paddingTop).toBe(PDF_CORNER_TAB_TOTAL_HEIGHT_PT);
    });
});
