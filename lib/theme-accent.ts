/**
 * CSS-Variablen für User-wählbare Brand-Farbe (wie AUDION).
 * Wird von applyBrandColorVars() gesetzt. Nav/Layout nutzen diese für Sidebar und Rahmen.
 */
export const THEME_ACCENT = {
    color: 'var(--color-theme-accent)',
    borderColor: 'var(--color-theme-accent)',
    backgroundColor: 'var(--color-theme-accent)',
} as const;

/** Fallback wenn CSS-Variable noch nicht gesetzt */
export const THEME_ACCENT_WITH_FALLBACK = {
    color: 'var(--color-theme-accent, var(--color-secondary-dx-green))',
    borderColor: 'var(--color-theme-accent, var(--color-secondary-dx-green))',
    backgroundColor: 'var(--color-theme-accent, var(--color-secondary-dx-green))',
} as const;

/** Einheitliche CSS-Werte für Rahmen, Tabs, Ringe (User-Brand aus localStorage). */
export const THEME_ACCENT_CSS = 'var(--color-theme-accent, var(--color-secondary-dx-green))';
export const THEME_ACCENT_TINT_CSS = 'var(--color-theme-accent-tint, var(--color-secondary-dx-green-tint))';
export const THEME_ACCENT_CONTRAST_CSS = 'var(--color-theme-accent-contrast, #000000)';

/**
 * `sx` für {@link MsqdxButton}: ersetzt `brandColor="green"` durch die dynamische Akzentfarbe.
 * Enthaltene Varianten: contained, outlined, text.
 */
export const MSQDX_BUTTON_THEME_ACCENT_SX = {
    '&.MuiButton-contained': {
        background: `${THEME_ACCENT_CSS} !important`,
        color: `${THEME_ACCENT_CONTRAST_CSS} !important`,
        '&:hover': {
            background: `${THEME_ACCENT_CSS} !important`,
            filter: 'brightness(1.08)',
        },
    },
    '&.MuiButton-outlined': {
        borderColor: `${THEME_ACCENT_CSS} !important`,
        color: `${THEME_ACCENT_CSS} !important`,
        '&:hover': {
            borderColor: `${THEME_ACCENT_CSS} !important`,
            backgroundColor: `${THEME_ACCENT_TINT_CSS} !important`,
        },
    },
    '&.MuiButton-text': {
        color: `${THEME_ACCENT_CSS} !important`,
        '&:hover': {
            backgroundColor: `${THEME_ACCENT_TINT_CSS} !important`,
        },
    },
} as const;

/**
 * `sx` für {@link MsqdxChip} (z. B. Zeitraum 7d/30d/90d): ausgewählt = User-Brand, sonst neutraler Rand.
 */
export function msqdxChipThemeAccentSx(selected: boolean): Record<string, unknown> {
    return {
        cursor: 'pointer',
        ...(selected
            ? {
                  backgroundColor: `${THEME_ACCENT_CSS} !important`,
                  color: `${THEME_ACCENT_CONTRAST_CSS} !important`,
                  borderColor: THEME_ACCENT_CSS,
              }
            : {
                  borderColor: 'var(--color-border-subtle, #ccc)',
              }),
    };
}

/** sx für FormField/Input mit Theme-Akzent (1:1 AUDION) */
export const FORM_FIELD_ACCENT_SX = {
    '& .MuiOutlinedInput-root': {
        borderColor: 'var(--color-theme-accent) !important',
        '&:hover': { borderColor: 'var(--color-theme-accent) !important' },
        '&.Mui-focused': { borderColor: 'var(--color-theme-accent) !important' },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--color-theme-accent) !important',
        },
    },
    '& .MuiInputLabel-root': {
        color: 'var(--color-input-label, var(--color-theme-accent)) !important',
    },
    '& .MuiInputLabel-root.Mui-focused': {
        color: 'var(--color-input-label, var(--color-theme-accent)) !important',
    },
} as const;
