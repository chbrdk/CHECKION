import { describe, expect, it } from 'vitest';
import {
    COOKIE_BANNER_HIDE_CSS,
    getCookieBannerDismissScript,
    SHADOW_DOM_ACCEPT_TARGETS,
} from '@/lib/cookie-banner-dismiss';

describe('cookie-banner-dismiss', () => {
    it('includes Usercentrics and Funding Choices hide selectors', () => {
        expect(COOKIE_BANNER_HIDE_CSS).toContain('#usercentrics-root');
        expect(COOKIE_BANNER_HIDE_CSS).toContain('.fc-consent-root');
    });

    it('dismiss script pierces open shadow roots for Usercentrics accept', () => {
        const script = getCookieBannerDismissScript();
        expect(script).toContain('shadowRoot');
        expect(script).toContain('uc-accept-all-button');
        expect(SHADOW_DOM_ACCEPT_TARGETS.some((t) => t.host === '#usercentrics-root')).toBe(true);
    });
});
