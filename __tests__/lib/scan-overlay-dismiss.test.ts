import { describe, expect, it } from 'vitest';
import {
    getOverlayDismissScript,
    OVERLAY_CLOSE_TEXTS,
    OVERLAY_HIDE_CSS,
} from '@/lib/scan-overlay-dismiss';

describe('scan-overlay-dismiss', () => {
    it('hides common chat widgets and newsletter patterns', () => {
        expect(OVERLAY_HIDE_CSS).toContain('#intercom-container');
        expect(OVERLAY_HIDE_CSS).toContain('newsletter-popup');
        expect(OVERLAY_HIDE_CSS).toContain('[role="dialog"][aria-label*="chat" i]');
    });

    it('dismiss script skips cookie-related elements', () => {
        const script = getOverlayDismissScript();
        expect(script).toContain('isCookieRelated');
        expect(script).toContain('usercentrics');
    });

    it('includes multilingual close labels', () => {
        expect(OVERLAY_CLOSE_TEXTS).toContain('schließen');
        expect(OVERLAY_CLOSE_TEXTS).toContain('not now');
    });
});
