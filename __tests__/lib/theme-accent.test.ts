import { describe, it, expect } from 'vitest';
import {
    THEME_ACCENT_CSS,
    THEME_ACCENT_TINT_CSS,
    THEME_ACCENT_CONTRAST_CSS,
    MSQDX_BUTTON_THEME_ACCENT_SX,
} from '@/lib/theme-accent';

describe('theme-accent', () => {
    it('exposes CSS vars with fallbacks for brand-driven UI', () => {
        expect(THEME_ACCENT_CSS).toContain('--color-theme-accent');
        expect(THEME_ACCENT_TINT_CSS).toContain('--color-theme-accent-tint');
        expect(THEME_ACCENT_CONTRAST_CSS).toContain('--color-theme-accent-contrast');
    });

    it('MSQDX_BUTTON_THEME_ACCENT_SX targets contained/outlined/text', () => {
        expect(MSQDX_BUTTON_THEME_ACCENT_SX['&.MuiButton-contained']).toBeDefined();
        expect(MSQDX_BUTTON_THEME_ACCENT_SX['&.MuiButton-outlined']).toBeDefined();
        expect(MSQDX_BUTTON_THEME_ACCENT_SX['&.MuiButton-text']).toBeDefined();
    });
});
