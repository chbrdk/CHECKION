import { describe, it, expect } from 'vitest';
import {
    THEME_ACCENT_CSS,
    THEME_ACCENT_TINT_CSS,
    THEME_ACCENT_CONTRAST_CSS,
    MSQDX_BUTTON_THEME_ACCENT_SX,
    MSQDX_INNER_CARD_BORDER_SX,
    MSQDX_TABS_THEME_ACCENT_SX,
    msqdxChipThemeAccentSx,
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

    it('MSQDX_INNER_CARD_BORDER_SX matches project rankings inner cards', () => {
        expect(MSQDX_INNER_CARD_BORDER_SX.border).toContain('--color-theme-accent');
    });

    it('MSQDX_TABS_THEME_ACCENT_SX uses theme accent for indicator and selected tab', () => {
        expect(MSQDX_TABS_THEME_ACCENT_SX['& .MuiTabs-indicator']?.backgroundColor).toBe(THEME_ACCENT_CSS);
        expect(String(MSQDX_TABS_THEME_ACCENT_SX['& .MuiTab-root.Mui-selected']?.color)).toContain(
            '--color-theme-accent',
        );
    });

    it('msqdxChipThemeAccentSx applies accent when selected', () => {
        expect(msqdxChipThemeAccentSx(true).backgroundColor).toBeDefined();
        expect(msqdxChipThemeAccentSx(false).borderColor).toBeDefined();
    });
});
